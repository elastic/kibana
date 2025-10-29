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

export function createOutputTokensEvaluator({
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
          explanation: 'No traceId available for output token use evaluation',
          metadata: undefined,
        };
      }

      async function fetchOutputTokenStats(): Promise<number> {
        const response = (await esClient.esql.query({
          query: `FROM traces-*
| WHERE trace.id == "${traceId}"
| STATS 
  output_tokens = SUM(attributes.gen_ai.usage.output_tokens)`,
        })) as unknown as EsqlResponse;

        const { columns, values } = response;

        if (!values || values.length === 0) {
          throw new Error('No token usage data found for trace');
        }

        const row = values[0];
        const outputTokensIdx = columns.findIndex((col) => col.name === 'output_tokens');

        return row[outputTokensIdx] ?? 0;
      }

      try {
        const outputTokens = await pRetry(fetchOutputTokenStats, {
          retries: 3,
          onFailedAttempt: (error) => {
            const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

            if (isLastAttempt) {
              log.error(
                new Error(
                  `Failed to retrieve output token use after ${error.attemptNumber} attempts`,
                  {
                    cause: error,
                  }
                )
              );
            } else {
              log.warning(
                `Output token use query failed on attempt ${error.attemptNumber}; retrying... (traceId: ${traceId})`
              );
            }
          },
        });

        return {
          score: outputTokens,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(
          `Failed to evaluate output token use after ${error.attemptNumber} attempts for trace ${traceId}: ${errorMessage}`
        );
        return {
          label: 'error',
          explanation: `Failed to retrieve output token use: ${errorMessage}`,
        };
      }
    },
    kind: 'CODE',
    name: 'Output Tokens',
  };
}
