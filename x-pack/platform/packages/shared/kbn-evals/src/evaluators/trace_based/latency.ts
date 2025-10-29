/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import type { Evaluator } from '../../types';

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: any[][];
}

export function createLatencyEvaluator({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Evaluator {
  return {
    evaluate: async ({ output }) => {
      const traceId = (output as any)?.traceId;

      if (!traceId) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No traceId available for latency evaluation',
          metadata: undefined,
        };
      }

      async function fetchLatencyStats(): Promise<number> {
        const response = (await esClient.esql.query({
          query: `FROM traces-*
| WHERE trace.id == "${traceId}"
| STATS total_duration_ns = MAX(duration)
| EVAL latency_seconds = TO_DOUBLE(total_duration_ns) / 1000000000
| KEEP latency_seconds`,
        })) as unknown as EsqlResponse;

        const { values } = response;

        if (!values || values.length === 0) {
          throw new Error('No latency data found for trace');
        }

        return values[0][0] as number;
      }

      try {
        const latency = await pRetry(fetchLatencyStats, {
          retries: 3,
          onFailedAttempt: (error) => {
            const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

            if (isLastAttempt) {
              log.error(
                new Error(`Failed to retrieve latency after ${error.attemptNumber} attempts`, {
                  cause: error,
                })
              );
            } else {
              log.warning(
                `Latency query failed on attempt ${error.attemptNumber}; retrying... (traceId: ${traceId})`
              );
            }
          },
        });

        return {
          score: latency,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Failed to evaluate latency for trace ${traceId}: ${errorMessage}`);
        return {
          label: 'error',
          explanation: `Failed to retrieve latency: ${errorMessage}`,
        };
      }
    },
    kind: 'CODE',
    name: 'Latency',
  };
}
