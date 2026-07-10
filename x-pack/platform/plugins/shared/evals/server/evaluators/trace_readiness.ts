/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import pRetry from 'p-retry';
import type { TraceAccessor } from './types';
import type { EvidenceMapping } from './evidence/types';
import { createTraceAccessor } from './trace_accessor';
import { normalizeEvidence, probeProfiles } from './evidence/evidence_service';
import { resolveEvidenceMapping } from './evidence/resolve_mapping';

const DEFAULT_EVIDENCE_MAPPING = resolveEvidenceMapping({ profile: 'elastic-inference' });

const hasNoTraceDocuments = async (traceAccessor: TraceAccessor): Promise<boolean> => {
  const accessor = createTraceAccessor(traceAccessor);
  const [logs, traces] = await Promise.all([
    accessor.runSearch('logs', {
      fields: ['@timestamp'],
      size: 1,
      sort: { field: '@timestamp', order: 'desc' },
    }),
    accessor.runSearch('traces', {
      fields: ['@timestamp'],
      size: 1,
      sort: { field: '@timestamp', order: 'desc' },
    }),
  ]);

  return logs.documents.length === 0 && traces.documents.length === 0;
};

const summarizeProfiles = async (traceAccessor: TraceAccessor): Promise<string> => {
  const probes = await probeProfiles(traceAccessor);
  return probes
    .map(({ profile, evidence }) => {
      const statuses = [
        `user_query=${evidence.user_query.status}`,
        `agent_response=${evidence.agent_response.status}`,
        `tool_calls=${evidence.tool_calls.status}`,
      ].join(', ');
      return `${profile}(${statuses})`;
    })
    .join('; ');
};

export const awaitTraceReady = async (
  traceAccessor: TraceAccessor,
  log: Logger,
  mapping: EvidenceMapping = DEFAULT_EVIDENCE_MAPPING
): Promise<void> => {
  // Gen AI log evidence lands a few seconds after the trace spans, so retry an empty
  // probe (it usually just hasn't exported yet) and only fail once retries run out.
  try {
    await pRetry(
      async () => {
        const round = await normalizeEvidence(traceAccessor, mapping);
        if (round.response.message.trim()) {
          return;
        }
        throw new Error(
          `Trace ${traceAccessor.traceId} is not ready: no gradable response available yet`
        );
      },
      {
        retries: 4,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 8000,
        onFailedAttempt: (error) => {
          log.warn(
            `Trace ${traceAccessor.traceId} not ready on attempt ${error.attemptNumber}; retrying`
          );
        },
      }
    );
  } catch {
    // Retries exhausted: the gradable evidence never landed. Probe once more to turn
    // this into an actionable message that distinguishes a target that emitted nothing
    // (tracing/capture disabled) from one that captured a question but no response.
    const [noDocuments, round, profileSummary] = await Promise.all([
      hasNoTraceDocuments(traceAccessor),
      normalizeEvidence(traceAccessor, mapping),
      summarizeProfiles(traceAccessor),
    ]);

    if (noDocuments) {
      throw new Error(
        `This run can't be evaluated: no trace or log documents were indexed for it. ` +
          `If it just finished, tracing may still be exporting; otherwise make sure ` +
          `OpenTelemetry tracing is enabled for the evaluated target.`
      );
    }

    const hasAnyResolvedEvidence = Boolean(round.input.message.trim()) || round.steps.length > 0;
    if (!hasAnyResolvedEvidence) {
      throw new Error(
        `This run can't be evaluated: no gradable content was found in its trace. ` +
          `Trace-based evaluators reconstruct a question and answer (plus any tool calls) from ` +
          `OpenTelemetry Gen AI spans, so message-content capture must be enabled for the ` +
          `evaluated target. (Probed profiles: ${profileSummary})`
      );
    }

    throw new Error(
      `This run can't be evaluated: its trace has an input but no gradable response, which ` +
        `usually means response message content wasn't captured. (Probed profiles: ${profileSummary})`
    );
  }
};
