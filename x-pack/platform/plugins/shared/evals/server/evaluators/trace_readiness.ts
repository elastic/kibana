/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import pRetry from 'p-retry';
import type { TraceAccessorWithSearch } from './trace_accessor';
import { hasTraceDocuments, normalizeEvidence, probeProfiles } from './evidence/evidence_service';
import type {
  InstrumentationProfile,
  InstrumentationProfileSpec,
  EvidenceRound,
} from './evidence/types';
import { TraceReadinessError } from './trace_readiness_errors';

const MISSING_AGENT_RESPONSE_ERROR_NAME = 'MissingAgentResponseError';

const createMissingAgentResponseError = (message: string): Error => {
  const error = new Error(message);
  error.name = MISSING_AGENT_RESPONSE_ERROR_NAME;
  return error;
};

const isMissingAgentResponseError = (error: unknown): boolean =>
  error instanceof Error && error.name === MISSING_AGENT_RESPONSE_ERROR_NAME;

const summarizeProfiles = async (traceAccessor: TraceAccessorWithSearch): Promise<string> => {
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

export { TraceReadinessError } from './trace_readiness_errors';

export const awaitTraceReady = async (
  traceAccessor: TraceAccessorWithSearch,
  mapping: InstrumentationProfileSpec,
  profile: InstrumentationProfile,
  log: Logger
): Promise<EvidenceRound> => {
  let lastRound: EvidenceRound | undefined;

  try {
    return await pRetry(
      async () => {
        if (!(await hasTraceDocuments(traceAccessor))) {
          throw new TraceReadinessError(
            `Trace ${traceAccessor.traceId} is not ready: no documents indexed in traces-* or logs-* yet`,
            'not_ready'
          );
        }

        const round = await normalizeEvidence(traceAccessor, mapping);
        lastRound = round;
        if (round.response.message.trim()) {
          return round;
        }

        const hasAnyResolvedEvidence =
          Boolean(round.input.message.trim()) ||
          Boolean(round.response.message.trim()) ||
          round.steps.length > 0;
        if (!hasAnyResolvedEvidence) {
          const profileSummary = await summarizeProfiles(traceAccessor);
          throw new pRetry.AbortError(
            new TraceReadinessError(
              `Trace ${traceAccessor.traceId} has documents but evidence is unresolvable for profile "${profile}". Probed profiles: ${profileSummary}`,
              'unresolvable'
            )
          );
        }

        throw createMissingAgentResponseError(
          `Trace ${traceAccessor.traceId} has documents but agent response is unavailable for profile "${profile}"`
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
  } catch (error) {
    if (!isMissingAgentResponseError(error) || !lastRound) {
      throw error;
    }

    return lastRound;
  }
};
