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
import type { Evaluator } from '../../types';

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: any[][];
}

// Returned by `fetchStats` when the metric is not measurable for this trace, to keep the
// "no value" case distinct from a legitimate score.
const NOT_REPORTED = Symbol('notReported');

export interface TraceBasedEvaluatorConfig {
  name: string;
  buildQuery: (traceId: string) => string;
  extractResult: (response: EsqlResponse) => number | null;
  // Optional validation for the extracted result. Return false to signal the trace data looks incomplete, which triggers a retry
  isResultValid?: (result: number | null) => boolean;
  // Optional check for a trace that is present but never emitted this metric, which no amount of
  // retrying will produce. Reported as an unscored result so aggregations exclude it, rather than
  // scored as a zero the provider never measured.
  isNotReported?: (response: EsqlResponse) => boolean;
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
  const { name, buildQuery, extractResult, isResultValid, isNotReported } = config;

  return {
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

      async function fetchStats(): Promise<number | typeof NOT_REPORTED> {
        const query = buildQuery(traceId);
        const response = (await traceEsClient.esql.query({ query })) as unknown as EsqlResponse;

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
