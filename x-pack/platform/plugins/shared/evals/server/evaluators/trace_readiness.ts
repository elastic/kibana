/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import pRetry from 'p-retry';
import type { TraceAccessorWithSearch } from './trace_accessor';
import {
  hasRootSpan,
  hasTraceDocuments,
  normalizeEvidence,
  probeProfiles,
} from './evidence/evidence_service';
import type {
  InstrumentationProfile,
  InstrumentationProfileSpec,
  EvidenceRound,
} from './evidence/types';
import { TraceReadinessError } from './trace_readiness_errors';

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

export interface AwaitTraceReadyOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
}

const hasResolvedEvidence = (round: EvidenceRound): boolean =>
  Boolean(round.input.message.trim()) ||
  Boolean(round.response.message.trim()) ||
  round.steps.length > 0;

/**
 * Blocks until a trace is safe to grade, then returns its normalized evidence round.
 *
 * Readiness requires two signals so an intermediate agent turn isn't graded as the final
 * answer: the root span is indexed (the task actually finished) and the response is
 * non-empty and unchanged across two polls (absorbing export skew, where the root can
 * index before the final span's content).
 *
 */
export const awaitTraceReady = async (
  traceAccessor: TraceAccessorWithSearch,
  mapping: InstrumentationProfileSpec,
  profile: InstrumentationProfile,
  log: Logger,
  options: AwaitTraceReadyOptions = {}
): Promise<EvidenceRound> => {
  const { retries = 8, minTimeout = 500, maxTimeout = 5000, factor = 2 } = options;

  let lastRound: EvidenceRound | undefined;
  let previousResponseMessage: string | undefined;

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

        if (!hasResolvedEvidence(round)) {
          throw new TraceReadinessError(
            `Trace ${traceAccessor.traceId} is not ready: documents indexed but no gradable evidence yet for profile "${profile}"`,
            'not_ready'
          );
        }

        const responseMessage = round.response.message.trim();
        // Compare against the previous poll *before* overwriting, so we only accept a
        // response that has stopped changing across consecutive polls.
        const responseStable =
          responseMessage.length > 0 && responseMessage === previousResponseMessage;
        previousResponseMessage = responseMessage;

        // Gate on the root span only once the response looks stable (cheap short-circuit).
        // Both signals must hold in the same poll: a stable *intermediate* response while
        // the task is still running is rejected because the root has not been indexed yet.
        if (responseStable && (await hasRootSpan(traceAccessor))) {
          return round;
        }

        throw new TraceReadinessError(
          `Trace ${traceAccessor.traceId} is not ready: awaiting a completed, stable response for profile "${profile}"`,
          'not_ready'
        );
      },
      {
        retries,
        factor,
        minTimeout,
        maxTimeout,
        onFailedAttempt: (error) => {
          // Retries are the normal path now (stability needs at least two polls), so this
          // is debug-level; the loud signal is the best-effort warn on budget exhaustion.
          log.debug(
            `Trace ${traceAccessor.traceId} not ready on attempt ${error.attemptNumber}; retrying`
          );
        },
      }
    );
  } catch (error) {
    // Best-effort: some evidence resolved but the trace never fully converged (no root
    // for a partial/external trace, or a response that kept changing within budget).
    // Grade what we have, but log loudly so the degradation is observable.
    if (lastRound && hasResolvedEvidence(lastRound)) {
      log.warn(
        `Trace ${traceAccessor.traceId} did not reach a completed, stable state within the readiness budget; grading best-effort evidence for profile "${profile}"`
      );
      return lastRound;
    }

    // Documents were present but no gradable evidence ever resolved within the budget: now
    // conclude "unresolvable" and attach the per-profile probe so misconfigured instrumentation
    // (or a truly empty trace) is easy to diagnose.
    if (lastRound) {
      const profileSummary = await summarizeProfiles(traceAccessor);
      throw new TraceReadinessError(
        `Trace ${traceAccessor.traceId} has documents but evidence is unresolvable for profile "${profile}". Probed profiles: ${profileSummary}`,
        'unresolvable'
      );
    }

    // Never saw any documents within the budget — surface the not_ready error as-is.
    throw error;
  }
};
