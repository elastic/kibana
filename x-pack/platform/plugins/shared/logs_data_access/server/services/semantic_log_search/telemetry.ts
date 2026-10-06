/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { context, metrics, SpanStatusCode, ValueType } from '@opentelemetry/api';
import type { Attributes, Meter, Span } from '@opentelemetry/api';
import { withActiveSpan } from '@kbn/tracing-utils';
import { getInferenceTracer, isInInferenceContext } from '@kbn/inference-tracing';
import type {
  SemanticLogSearchResult,
  LogPattern,
} from '../../../common/services/semantic_log_search/types';
import type {
  ErrorReason,
  SearchPhase,
  UnavailableReason,
} from '../../../common/services/semantic_log_search/constants';
import { isCancellationError } from './results';

export const TELEMETRY_SCOPE = 'kibana.logs.semantic_search';
const CUSTOM_RERANK_ENDPOINT = 'custom';
const DURATION_BUCKETS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 90];
const PHASE_SPAN_NAMES = {
  capabilities: 'capabilities',
  probe: 'probe',
  search: 'collect_candidates',
  rerank: 'rerank',
} as const;
const ERROR_TYPES = [
  'parsing_exception',
  'verification_exception',
  'security_exception',
  'circuit_breaking_exception',
  'es_rejected_execution_exception',
  'resource_not_found_exception',
  'index_not_found_exception',
  'model_deployment_timeout_exception',
  'timeout_exception',
  'TimeoutError',
  'ResponseError',
  'TypeError',
  'Error',
] as const;
type TelemetryErrorType = (typeof ERROR_TYPES)[number] | 'other';

type SearchOutcome = 'success' | 'empty' | 'unavailable' | 'rejected' | 'cancelled' | 'failed';

/** Root span attributes, unprefixed. Every value is bounded and free of request content. */
interface SearchSummary {
  outcome: SearchOutcome;
  duration_ms: number;
  caller: 'inference' | 'other';
  reason?: ErrorReason | UnavailableReason;
  error_type?: TelemetryErrorType;
  failure_phase?: SearchPhase | 'validation' | 'unknown';
  pattern_count?: number;
  sampled?: boolean;
  candidate_count?: number;
  selected_candidate_count?: number;
  candidates_capped?: boolean;
  categorize_row_limit_reached?: boolean;
  rerank_endpoint?: string;
  rerank_service?: string;
}
type Evidence = Pick<
  SearchSummary,
  | 'sampled'
  | 'candidate_count'
  | 'selected_candidate_count'
  | 'candidates_capped'
  | 'categorize_row_limit_reached'
>;

/** Bounds error classifiers that can otherwise contain arbitrary Error names or Elasticsearch strings. */
export const classifyTelemetryError = (type: string): TelemetryErrorType =>
  ERROR_TYPES.find((allowed) => allowed === type) ?? 'other';
interface CategorizeAttributes {
  pass: 'single' | 'head' | 'rare' | 'fallback';
  sampling_probability: number;
  noise_threshold: number;
  exclusion_count: number;
  row_limit: number;
}

export interface SearchObservation {
  phase: <T>(
    phase: SearchPhase,
    run: () => Promise<T>,
    failed?: (value: T) => boolean
  ) => Promise<T>;
  categorize: (
    attributes: CategorizeAttributes,
    run: () => Promise<LogPattern[]>
  ) => Promise<LogPattern[]>;
  evidence: (values: Evidence) => void;
  inputSize: (characters: number) => void;
  rerankEndpoint: (inferenceId: string, service?: string) => void;
}

export interface SemanticSearchTelemetry {
  search: (
    run: (observation: SearchObservation) => Promise<SemanticLogSearchResult>
  ) => Promise<SemanticLogSearchResult>;
}

const safely = <T>(report: () => T): T | undefined => {
  try {
    return report();
  } catch {
    // Telemetry must not replace a search result or prevent another signal from reporting.
  }
};

const inInferenceContext = (): boolean =>
  safely(() => isInInferenceContext(context.active())) ?? false;

const attributesFor = (values: Attributes): Attributes =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [`${TELEMETRY_SCOPE}.${key}`, value])
  );

/**
 * Bounds the configured inference id for metric and span attributes. Elasticsearch rejects
 * user-created ids that start with a dot, so those are always Elastic's preconfigured catalog.
 */
export const toRerankEndpointLabel = (inferenceId: string): string =>
  inferenceId.startsWith('.') ? inferenceId : CUSTOM_RERANK_ENDPOINT;

const getOutcome = (result: SemanticLogSearchResult): SearchOutcome => {
  if (result.status === 'success') return result.patterns.length ? 'success' : 'empty';
  if (result.status === 'unavailable') return 'unavailable';
  if (result.reason === 'cancelled') return 'cancelled';
  if (result.reason === 'invalid_params') return 'rejected';
  return 'failed';
};

const finishSpan = (span: Span | undefined, outcome: SearchOutcome, reason?: string): void => {
  safely(() => {
    span?.setAttributes(attributesFor({ outcome }));
    if (outcome === 'failed') {
      span?.setAttribute('error.type', reason ?? 'execution');
      span?.setStatus({ code: SpanStatusCode.ERROR });
    } else if (outcome === 'success' || outcome === 'empty') {
      span?.setStatus({ code: SpanStatusCode.OK });
    }
  });
  // End before withActiveSpan can turn a returned failure into OK or capture a raw exception.
  safely(() => span?.end());
};

const recordException = (span: Span | undefined, cancelled: boolean): void => {
  if (!cancelled) {
    safely(() =>
      span?.recordException({
        name: 'SemanticLogSearchError',
        message: 'Semantic log search phase failed',
      })
    );
  }
};

const withServiceSpan = async <T>(
  name: string,
  attributes: Attributes,
  run: (span?: Span) => Promise<T>
): Promise<T> => {
  let execution: Promise<T> | undefined;
  try {
    await withActiveSpan(
      name,
      {
        attributes: attributesFor(attributes),
        ...(inInferenceContext() ? { tracer: getInferenceTracer() } : {}),
      },
      (span) => {
        execution = run(span);
        // Keep raw search errors out of the shared helper's automatic exception capture,
        // even when a failed span.end() leaves the span recording.
        return execution.then(
          () => undefined,
          () => undefined
        );
      }
    );
  } catch {
    // A failed tracer must never cause a second execution of a request that already started.
  }
  return execution ?? run();
};

/** Observes a phase when telemetry is configured, preserving the original operation otherwise. */
export const observePhase = <T>(
  observation: SearchObservation | undefined,
  phase: SearchPhase,
  run: () => Promise<T>,
  failed?: (value: T) => boolean
): Promise<T> => (observation ? observation.phase(phase, run, failed) : run());

/** Creates service telemetry with stable metric instruments and request-local observation state. */
export const createSemanticSearchTelemetry = (configuredMeter?: Meter): SemanticSearchTelemetry => {
  const meter = safely(() => configuredMeter ?? metrics.getMeter(TELEMETRY_SCOPE));
  const completed = safely(() =>
    meter?.createCounter(`${TELEMETRY_SCOPE}.requests`, {
      description: 'Completed semantic log search attempts.',
      unit: '{request}',
      valueType: ValueType.INT,
    })
  );
  const duration = safely(() =>
    meter?.createHistogram(`${TELEMETRY_SCOPE}.duration`, {
      description: 'Semantic log search attempt duration.',
      unit: 's',
      valueType: ValueType.DOUBLE,
      advice: { explicitBucketBoundaries: DURATION_BUCKETS },
    })
  );
  const active = safely(() =>
    meter?.createUpDownCounter(`${TELEMETRY_SCOPE}.active_requests`, {
      description: 'Currently executing semantic log search attempts.',
      unit: '{request}',
      valueType: ValueType.INT,
    })
  );
  const phaseDuration = safely(() =>
    meter?.createHistogram(`${TELEMETRY_SCOPE}.phase.duration`, {
      description: 'Duration of executed semantic log search phases and categorization passes.',
      unit: 's',
      valueType: ValueType.DOUBLE,
      advice: { explicitBucketBoundaries: DURATION_BUCKETS },
    })
  );

  return {
    search: (
      run: (observation: SearchObservation) => Promise<SemanticLogSearchResult>
    ): Promise<SemanticLogSearchResult> => {
      const start = performance.now();
      const caller = inInferenceContext() ? 'inference' : 'other';
      const evidence: Evidence = {};
      const rerank: Pick<SearchSummary, 'rerank_endpoint' | 'rerank_service'> = {};
      let lastPhase: SearchSummary['failure_phase'] = 'validation';
      safely(() => active?.add(1));

      return withServiceSpan('semantic_log_search.search', { caller }, async (rootSpan) => {
        const timedPhase = async <T>(
          name: string,
          attributes: Attributes,
          operation: (span?: Span) => Promise<T>,
          failed?: (value: T) => boolean
        ): Promise<T> => {
          const phaseStart = performance.now();
          return withServiceSpan(`semantic_log_search.${name}`, attributes, async (span) => {
            let outcome: SearchOutcome = 'success';
            try {
              const value = await operation(span);
              if (failed?.(value)) outcome = 'failed';
              return value;
            } catch (error) {
              const cancelled = isCancellationError(error);
              outcome = cancelled ? 'cancelled' : 'failed';
              recordException(span, cancelled);
              throw error;
            } finally {
              safely(() =>
                phaseDuration?.record((performance.now() - phaseStart) / 1000, {
                  phase: name,
                  outcome,
                  ...(rerank.rerank_endpoint ? { rerank_endpoint: rerank.rerank_endpoint } : {}),
                })
              );
              finishSpan(span, outcome);
            }
          });
        };

        const observation: SearchObservation = {
          phase: (phase, operation, failed) => {
            lastPhase = phase;
            return timedPhase(PHASE_SPAN_NAMES[phase], {}, operation, failed);
          },
          categorize: (attributes, operation) => {
            evidence.sampled = evidence.sampled === true || attributes.sampling_probability < 1;
            return timedPhase('categorize', { ...attributes }, async (span) => {
              const patterns = await operation();
              const rowLimitReached = patterns.length >= attributes.row_limit;
              evidence.categorize_row_limit_reached =
                evidence.categorize_row_limit_reached === true || rowLimitReached;
              safely(() =>
                span?.setAttributes(
                  attributesFor({ row_count: patterns.length, row_limit_reached: rowLimitReached })
                )
              );
              return patterns;
            });
          },
          evidence: (values) => {
            Object.assign(evidence, values);
          },
          inputSize: (characters) => {
            safely(() =>
              rootSpan?.setAttribute(`${TELEMETRY_SCOPE}.rerank_input_characters`, characters)
            );
          },
          rerankEndpoint: (inferenceId, service) => {
            rerank.rerank_endpoint = toRerankEndpointLabel(inferenceId);
            if (service) rerank.rerank_service = service;
          },
        };

        let completion: Omit<SearchSummary, 'duration_ms' | 'caller'> = {
          outcome: 'failed',
          reason: 'execution',
          failure_phase: 'unknown',
        };
        try {
          const result = await run(observation);
          const outcome = getOutcome(result);
          completion =
            result.status === 'success'
              ? { outcome, pattern_count: result.patterns.length }
              : {
                  outcome,
                  reason: result.reason,
                  failure_phase:
                    result.status === 'error' ? result.diagnostics?.phase ?? lastPhase : lastPhase,
                };
          if (result.status === 'error' && result.diagnostics?.elasticsearchErrorType) {
            completion.error_type = classifyTelemetryError(
              result.diagnostics.elasticsearchErrorType
            );
          }
          return result;
        } catch (error) {
          completion.failure_phase = lastPhase;
          const cancelled = isCancellationError(error);
          if (cancelled) {
            completion.outcome = 'cancelled';
            completion.reason = 'cancelled';
          }
          recordException(rootSpan, cancelled);
          throw error;
        } finally {
          const elapsed = performance.now() - start;
          const summary: SearchSummary = {
            ...completion,
            ...evidence,
            ...rerank,
            duration_ms: elapsed,
            caller,
          };
          const attributes = {
            outcome: completion.outcome,
            caller,
            ...(completion.reason ? { reason: completion.reason } : {}),
            ...(completion.failure_phase ? { failure_phase: completion.failure_phase } : {}),
            ...(rerank.rerank_endpoint ? { rerank_endpoint: rerank.rerank_endpoint } : {}),
          };
          safely(() => active?.add(-1));
          safely(() => completed?.add(1, attributes));
          safely(() => duration?.record(elapsed / 1000, attributes));
          safely(() => rootSpan?.setAttributes(attributesFor({ ...summary })));
          finishSpan(rootSpan, completion.outcome, completion.error_type ?? completion.reason);
        }
      });
    },
  };
};
