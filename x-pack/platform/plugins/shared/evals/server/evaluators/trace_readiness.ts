/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import pRetry from 'p-retry';
import type { TraceAccessor } from './types';
import { hasTraceDocuments, normalizeEvidence, probeProfiles } from './evidence/evidence_service';
import type { EvidenceMapping, EvidenceProfile } from './evidence/types';

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
  mapping: EvidenceMapping,
  profile: EvidenceProfile,
  log: Logger
): Promise<void> => {
  await pRetry(
    async () => {
      if (!(await hasTraceDocuments(traceAccessor))) {
        throw new Error(
          `Trace ${traceAccessor.traceId} is not ready: no documents indexed in traces-* or logs-* yet`
        );
      }

      const round = await normalizeEvidence(traceAccessor, mapping);
      if (round.response.message.trim()) {
        return;
      }

      const profileSummary = await summarizeProfiles(traceAccessor);
      const hasAnyResolvedEvidence =
        Boolean(round.input.message.trim()) ||
        Boolean(round.response.message.trim()) ||
        round.steps.length > 0;
      if (!hasAnyResolvedEvidence) {
        throw new pRetry.AbortError(
          `Trace ${traceAccessor.traceId} has documents but evidence is unresolvable for profile "${profile}". Probed profiles: ${profileSummary}`
        );
      }

      throw new pRetry.AbortError(
        `Trace ${traceAccessor.traceId} has documents but agent response is unavailable for profile "${profile}". Probed profiles: ${profileSummary}`
      );
    },
    {
      retries: 2,
      factor: 2,
      minTimeout: 2000,
      maxTimeout: 10000,
      onFailedAttempt: (error) => {
        log.warn(
          `Trace ${traceAccessor.traceId} not ready on attempt ${error.attemptNumber}; retrying`
        );
      },
    }
  );
};
