/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import type { Logger } from '@kbn/logging';
import { isEqual } from 'lodash';
import pRetry from 'p-retry';
import {
  extractProfilesEvidence,
  extractSelectedEvidence,
  hasResolvedEvidence,
  hasRootSpan,
  hasTraceDocuments,
  toInstrumentationProfileProbes,
  type EvidenceExtractionResult,
  type InstrumentationProfileEvidenceResult,
  type InstrumentationProfileProbeResult,
} from './evidence/evidence_service';
import { INSTRUMENTATION_PROFILES } from './evidence/profiles';
import type { EvidenceRound, InstrumentationProfile } from './evidence/types';
import type { TraceAccessorWithSearch } from './trace_accessor';
import { getNoTraceDocumentsMessage, TraceReadinessError } from './trace_readiness_errors';

export { TraceReadinessError } from './trace_readiness_errors';

export const STABILITY_WINDOW_MS = 5000;
const DIAGNOSTIC_RETRIES = 2;

export type TraceWaitMode = 'stable' | 'complete';
export type AchievedTraceReadiness = TraceWaitMode | 'best_effort';

export interface AwaitTraceReadyOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
  stabilityWindowMs?: number;
}

export interface AwaitTraceReadyRequest {
  mode: TraceWaitMode;
  profile?: InstrumentationProfile;
}

export interface AwaitTraceReadyResult extends EvidenceExtractionResult {
  profile: InstrumentationProfile;
  readiness: AchievedTraceReadiness;
}

interface ReadinessBaseline {
  profile: InstrumentationProfile;
  round: EvidenceRound;
  timestamp: number;
}

const summarizeProfiles = (profiles: InstrumentationProfileProbeResult[]): string =>
  profiles
    .map(({ profile, evidence }) => {
      const statuses = [
        `user_query=${evidence.user_query.status}`,
        `agent_response=${evidence.agent_response.status}`,
        `tool_calls=${evidence.tool_calls.status}`,
      ].join(', ');
      return `${profile}(${statuses})`;
    })
    .join('; ');

const profileRequiresStabilityWindow = (profile: InstrumentationProfile): boolean =>
  Object.values(INSTRUMENTATION_PROFILES[profile]).some(({ source }) => source === 'logs');

const isRetryableSearchError = (error: unknown): error is EsErrors.ElasticsearchClientError =>
  error instanceof EsErrors.ElasticsearchClientError && isRetryableEsClientError(error);

const abortRetryOnUnexpectedError = async <T>(
  operation: () => Promise<T>,
  onError?: (error: unknown) => void
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    onError?.(error);
    if (error instanceof TraceReadinessError || isRetryableSearchError(error)) {
      throw error;
    }
    throw new pRetry.AbortError(error instanceof Error ? error : new Error(String(error)));
  }
};

const retryWithLastError = async <T>(
  operation: () => Promise<T>,
  options: pRetry.Options
): Promise<T> => {
  let lastError: unknown;
  try {
    return await pRetry(
      () =>
        abortRetryOnUnexpectedError(operation, (error) => {
          lastError = error;
        }),
      options
    );
  } catch (error) {
    throw lastError ?? error;
  }
};

/** Blocks until normalized trace evidence reaches the requested readiness level. */
export const awaitTraceReady = async (
  traceAccessor: TraceAccessorWithSearch,
  request: AwaitTraceReadyRequest,
  log: Logger,
  options: AwaitTraceReadyOptions = {}
): Promise<AwaitTraceReadyResult> => {
  const {
    retries = 8,
    minTimeout = 500,
    maxTimeout = 5000,
    factor = 2,
    stabilityWindowMs = STABILITY_WINDOW_MS,
  } = options;

  let baseline: ReadinessBaseline | undefined;
  let lastEvidence: AwaitTraceReadyResult | undefined;
  let latestProfiles: InstrumentationProfileEvidenceResult[] | undefined;
  let sawDocuments = false;

  const attemptReadiness = async (): Promise<AwaitTraceReadyResult> => {
    if (!sawDocuments && !(await hasTraceDocuments(traceAccessor))) {
      throw new TraceReadinessError(getNoTraceDocumentsMessage(traceAccessor.traceId), 'not_ready');
    }
    sawDocuments = true;

    const selection = await extractSelectedEvidence(traceAccessor, request.profile);
    latestProfiles = selection.profiles ?? latestProfiles;
    const { selected } = selection;
    const partialAutoSelection = request.profile
      ? undefined
      : selection.profiles?.find(({ round }) => hasResolvedEvidence(round));
    const latestSelection = selected ?? partialAutoSelection;

    if (!latestSelection || !hasResolvedEvidence(latestSelection.round)) {
      baseline = undefined;
      lastEvidence = undefined;
      throw new TraceReadinessError(
        `Trace ${
          traceAccessor.traceId
        } is not ready: documents indexed but no gradable evidence yet${
          request.profile ? ` for profile "${request.profile}"` : ''
        }`,
        'not_ready'
      );
    }

    lastEvidence = {
      ...latestSelection,
      readiness: 'best_effort',
    };

    if (!selected) {
      baseline = undefined;
      throw new TraceReadinessError(
        `Trace ${traceAccessor.traceId} is not ready: awaiting a fully detected instrumentation profile`,
        'not_ready'
      );
    }

    const now = Date.now();
    if (
      !baseline ||
      baseline.profile !== selected.profile ||
      !isEqual(baseline.round, selected.round)
    ) {
      baseline = { profile: selected.profile, round: selected.round, timestamp: now };
      throw new TraceReadinessError(
        `Trace ${traceAccessor.traceId} is not ready: awaiting stable evidence for profile "${selected.profile}"`,
        'not_ready'
      );
    }

    const requiredWindowMs =
      request.mode === 'stable' || profileRequiresStabilityWindow(selected.profile)
        ? stabilityWindowMs
        : 0;
    if (now - baseline.timestamp < requiredWindowMs) {
      throw new TraceReadinessError(
        `Trace ${traceAccessor.traceId} is not ready: evidence has not remained stable for ${requiredWindowMs}ms`,
        'not_ready'
      );
    }

    if (request.mode === 'complete') {
      if (!selected.round.response.message.trim() || !(await hasRootSpan(traceAccessor))) {
        throw new TraceReadinessError(
          `Trace ${traceAccessor.traceId} is not ready: awaiting a root span and completed response for profile "${selected.profile}"`,
          'not_ready'
        );
      }
    }

    return {
      ...selected,
      readiness: request.mode,
    };
  };

  try {
    return await retryWithLastError(attemptReadiness, {
      retries,
      factor,
      minTimeout,
      maxTimeout,
      onFailedAttempt: (error) => {
        log.debug(
          `Trace ${traceAccessor.traceId} not ready on attempt ${error.attemptNumber}; retrying`
        );
      },
    });
  } catch (error) {
    const exhaustedRetryableSearch = isRetryableSearchError(error);
    if (!(error instanceof TraceReadinessError) && !exhaustedRetryableSearch) {
      throw error;
    }

    if (lastEvidence) {
      log.warn(
        `Trace ${traceAccessor.traceId} did not reach ${request.mode} readiness within the budget; returning best-effort evidence for profile "${lastEvidence.profile}"`
      );
      return lastEvidence;
    }

    if (exhaustedRetryableSearch) {
      throw error;
    }

    if (sawDocuments) {
      const profiles =
        latestProfiles ??
        (await retryWithLastError(() => extractProfilesEvidence(traceAccessor), {
          retries: Math.min(DIAGNOSTIC_RETRIES, retries),
          factor,
          minTimeout,
          maxTimeout,
          onFailedAttempt: (diagnosticError) => {
            log.debug(
              `Trace ${traceAccessor.traceId} diagnostics failed on attempt ${diagnosticError.attemptNumber}; retrying`
            );
          },
        }));
      const requestedProfileEvidence = request.profile
        ? profiles.find(({ profile }) => profile === request.profile)
        : undefined;
      if (requestedProfileEvidence && hasResolvedEvidence(requestedProfileEvidence.round)) {
        log.warn(
          `Trace ${traceAccessor.traceId} did not reach ${request.mode} readiness within the budget; returning best-effort evidence for profile "${requestedProfileEvidence.profile}"`
        );
        return {
          ...requestedProfileEvidence,
          readiness: 'best_effort',
        };
      }

      const probes = toInstrumentationProfileProbes(profiles);
      const requestedProfile = request.profile ? ` for profile "${request.profile}"` : '';
      throw new TraceReadinessError(
        `Trace ${
          traceAccessor.traceId
        } has documents but evidence is unresolvable${requestedProfile}. Probed profiles: ${summarizeProfiles(
          probes
        )}`,
        'unresolvable',
        probes
      );
    }

    throw error;
  }
};
