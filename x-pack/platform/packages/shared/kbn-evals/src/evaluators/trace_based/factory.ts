/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { isValidTraceId } from '@opentelemetry/api';
import pRetry from 'p-retry';
import type { Direction } from '@kbn/evals-common';
import type { Evaluator } from '../../types';

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: any[][];
}

// Returned by `fetchStats` when the metric is not measurable for this trace, to keep the
// "no value" case distinct from a legitimate score.
const NOT_REPORTED = Symbol('notReported');

// The queried trace store cannot serve `trace.id` at all — ES|QL rejects the query with
// `Unknown column [trace.id]`, which is how a missing traces-* read privilege or an
// unreadable index pattern surfaces (the privilege failure is masked as a schema failure).
// Only reported as unavailable when the suite opted in (`tracesUnavailableForSuiteMode`);
// without the opt-in losing read privilege is a real failure, not an expected empty store.
// Returned instead of throwing so the deterministic failure doesn't burn the retry budget.
const TRACE_STORE_UNREADABLE = Symbol('traceStoreUnreadable');

// The trace store is readable but holds no spans for this trace. Only produced when the
// suite declared (via `tracesUnavailableForSuiteMode`) that its generation path cannot
// export traces to the queried store, and a COUNT(*) probe of spans for the trace.id
// returned 0. A STATS-without-BY query always returns exactly one row ([[0]] / [[null]]),
// so the empty-values shape alone cannot distinguish an empty store; the probe is what
// makes the opt-in reachable on real query shapes.
const NO_SPANS_FOR_SUITE_MODE = Symbol('noSpansForSuiteMode');

// Matches the ES|QL verification_exception the trace store returns when `trace.id` is not
// readable — either because the index pattern is unreadable or because the credentials lack
// the traces-* read privilege. Any other unknown column is a query bug and stays a failure.
const TRACE_ID_COLUMN_UNREADABLE = /Unknown column \[trace\.id\]/;

function isTraceStoreUnreadableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return TRACE_ID_COLUMN_UNREADABLE.test(message);
}

export interface TraceBasedEvaluatorConfig {
  name: string;
  buildQuery: (traceId: string) => string;
  extractResult: (response: EsqlResponse) => number | null;
  // Optional validation for the extracted result. Return false to signal the trace data looks incomplete, which triggers a retry
  isResultValid?: (result: number | null) => boolean;
  // Trace is present but never emitted this metric, so retrying cannot help. Scored as unreported
  // rather than zero, which the provider never measured.
  isNotReported?: (response: EsqlResponse) => boolean;
  // An unmapped column makes ES|QL reject the query, leaving no row for `isNotReported`. Re-asks
  // without it: a complete trace means unreported rather than not yet indexed.
  notReportedProbe?: {
    matchesQueryError: (error: unknown) => boolean;
    buildQuery: (traceId: string) => string;
    isTraceComplete: (response: EsqlResponse) => boolean;
  };
  /**
   * Whether a higher score is an improvement (`maximize`), a lower score is
   * an improvement (`minimize`), or the score cannot be compared across arms
   * at all (`neutral`).
   */
  direction: Direction;

  /**
   * Explicit suite opt-in: this suite's generation path cannot export traces to the
   * queried trace store (e.g. AD generation spans are exported elsewhere by design),
   * so a readable-but-empty trace store is expected. When set, an empty result is
   * scored as `unavailable`/`no_spans_for_suite_mode` instead of failing after retries.
   */
  tracesUnavailableForSuiteMode?: boolean;
}

export function createTraceBasedEvaluator({
  traceEsClient,
  log,
  config,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
  config: TraceBasedEvaluatorConfig;
}): Evaluator {
  const {
    name,
    buildQuery,
    extractResult,
    isResultValid,
    isNotReported,
    notReportedProbe,
    direction,
    tracesUnavailableForSuiteMode = false,
  } = config;

  return {
    direction,
    evaluate: async ({ output }) => {
      const traceId = (output as any)?.traceId;

      if (!traceId) {
        return {
          score: null,
          label: 'unavailable',
          explanation: `No traceId available for ${name} evaluation`,
          metadata: undefined,
        };
      }

      const isTraceIdValid = typeof traceId === 'string' && isValidTraceId(traceId);
      if (!isTraceIdValid) {
        log.error(`Invalid traceId for ${name} (traceId: ${traceId})`);
        return {
          score: null,
          label: 'error',
          explanation: 'Invalid traceId',
          metadata: undefined,
        };
      }

      let lastResult: number | null | undefined;

      async function runQuery(query: string): Promise<EsqlResponse> {
        return (await traceEsClient.esql.query({ query })) as unknown as EsqlResponse;
      }

      // Anything the probe cannot vouch for stays a failure, so real query errors still surface.
      async function probeNotReported(error: unknown): Promise<typeof NOT_REPORTED> {
        if (!notReportedProbe?.matchesQueryError(error)) {
          throw error;
        }

        let probeResponse: EsqlResponse;
        try {
          probeResponse = await runQuery(notReportedProbe.buildQuery(traceId));
        } catch {
          // Probe failed too, so nothing can be concluded about the trace.
          throw error;
        }

        if (!probeResponse.values?.length || !notReportedProbe.isTraceComplete(probeResponse)) {
          throw error;
        }

        log.debug(
          `${name} is not reported by this provider (column missing from the mapping), trace ${traceId} is otherwise complete`
        );
        return NOT_REPORTED;
      }

      // Opt-in probe: STATS-without-BY queries always return exactly one row ([[0]] or
      // [[null]] on an empty store), so "no spans" cannot be told apart from "spans but
      // no value" by the evaluator query's own shape. When the suite opted in, a COUNT(*)
      // over the same FROM/WHERE runs first: 0 spans → the suite's declared mode (a [[0]]
      // tool_calls result is then N/A, not a real zero); > 0 spans → the evaluator query
      // runs as normal and a 0 it returns is a real 0.
      async function countSpansForTrace(): Promise<number> {
        const probe = await runQuery(
          `FROM traces-* | WHERE trace.id == "${traceId}" | STATS span_count = COUNT(*)`
        );
        const count = Number(probe.values?.[0]?.[0]);
        if (!Number.isFinite(count)) {
          throw new Error(
            `${name}: span count probe returned no usable value for trace ${traceId}`
          );
        }
        return count;
      }

      async function fetchStats(): Promise<
        | number
        | typeof NOT_REPORTED
        | typeof TRACE_STORE_UNREADABLE
        | typeof NO_SPANS_FOR_SUITE_MODE
      > {
        if (tracesUnavailableForSuiteMode) {
          let spanCount: number;
          try {
            spanCount = await countSpansForTrace();
          } catch (error) {
            // The probe hits the same unreadable store the evaluator query would; report
            // it the same way instead of burning the retry budget on a deterministic error.
            if (isTraceStoreUnreadableError(error)) {
              log.warning(
                `${name}: trace store is unreadable for trace queries (Unknown column [trace.id]) — this almost always means the trace store credentials lack the traces-* read privilege, or the index pattern is unreadable (traceId: ${traceId})`
              );
              return TRACE_STORE_UNREADABLE;
            }
            throw error;
          }
          if (spanCount === 0) {
            log.debug(
              `${name}: no spans for trace ${traceId} in the queried store (COUNT(*) = 0), as declared for this suite's generation mode`
            );
            return NO_SPANS_FOR_SUITE_MODE;
          }
        }

        const query = buildQuery(traceId);

        let response: EsqlResponse;
        try {
          response = await runQuery(query);
        } catch (error) {
          if (isTraceStoreUnreadableError(error)) {
            // Deterministic (credential/pattern) failure: the store cannot serve trace.id
            // for any trace, so retrying cannot help. Only an opted-in suite may report it
            // as unavailable — without the opt-in losing read privilege is a real failure.
            if (!tracesUnavailableForSuiteMode) {
              throw error;
            }
            log.warning(
              `${name}: trace store is unreadable for trace queries (Unknown column [trace.id]) — this almost always means the trace store credentials lack the traces-* read privilege, or the index pattern is unreadable (traceId: ${traceId})`
            );
            return TRACE_STORE_UNREADABLE;
          }
          return probeNotReported(error);
        }

        const { values } = response;

        if (!values || values.length === 0) {
          throw new Error(`No data found for trace`);
        }

        if (isNotReported?.(response)) {
          return NOT_REPORTED;
        }

        const result = extractResult(response);
        lastResult = result;

        const valid = isResultValid ? isResultValid(result) : result !== null;
        if (!valid) {
          throw new Error(`${name} result looks incomplete (value: ${result}), retrying`);
        }

        return result as number;
      }

      try {
        const score = await pRetry(fetchStats, {
          retries: 5,
          factor: 2,
          minTimeout: 2000,
          maxTimeout: 60000,
          onFailedAttempt: (error) => {
            log.debug(
              `${name} query failed on attempt ${error.attemptNumber}, ${error.retriesLeft} retries left (traceId: ${traceId}): ${error.message}`
            );
          },
        });

        if (score === NOT_REPORTED) {
          return {
            score: null,
            label: 'unavailable',
            explanation: `${name} was not reported for trace ${traceId}`,
          };
        }

        if (score === TRACE_STORE_UNREADABLE) {
          return {
            score: null,
            label: 'unavailable',
            explanation: `${name}: the queried trace store could not serve trace.id for trace ${traceId} (Unknown column [trace.id] — trace store unreadable, typically a missing traces-* read privilege or an unreadable index pattern)`,
            metadata: { reason: 'trace_store_unreadable' },
          };
        }

        if (score === NO_SPANS_FOR_SUITE_MODE) {
          return {
            score: null,
            label: 'unavailable',
            explanation: `${name}: the trace store holds no spans for trace ${traceId}, which is expected for this suite's generation mode (it does not export traces to the queried store)`,
            metadata: { reason: 'no_spans_for_suite_mode' },
          };
        }

        return {
          score,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Exhausting the retry budget is not a suite failure while a usable value is still
        // available, so this stays below `error` to keep genuine failures visible in CI output.
        if (lastResult !== undefined) {
          log.warning(
            `${name} returning potentially incomplete result for trace ${traceId}: ${lastResult} (${errorMessage})`
          );
          return {
            score: lastResult,
            label: 'potentially_incomplete',
            explanation: `${name} may be based on incomplete trace data`,
            metadata: { incomplete: true },
          };
        }

        log.error(`Failed to evaluate ${name} for trace ${traceId}: ${errorMessage}`);
        return {
          label: 'error',
          explanation: `Failed to retrieve ${name}: ${errorMessage}`,
        };
      }
    },
    kind: 'CODE',
    name,
  };
}
