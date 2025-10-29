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

export function createInputTokensEvaluator({
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
          explanation: 'No traceId available for token use evaluation',
          metadata: undefined,
        };
      }

      async function fetchInputTokenStats(): Promise<number> {
        const response = (await esClient.esql.query({
          query: `FROM traces-*
| WHERE trace.id == "${traceId}"
| STATS 
  input_tokens = SUM(attributes.gen_ai.usage.input_tokens)`,
        })) as unknown as EsqlResponse;

        const { columns, values } = response;

        if (!values || values.length === 0) {
          throw new Error('No token usage data found for trace');
        }

        const row = values[0];
        const inputTokensIdx = columns.findIndex((col) => col.name === 'input_tokens');

        return row[inputTokensIdx] ?? 0;
      }

      try {
        const inputTokens = await pRetry(fetchInputTokenStats, {
          retries: 3,
          onFailedAttempt: (error) => {
            const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

            if (isLastAttempt) {
              log.error(
                new Error(
                  `Failed to retrieve input token use after ${error.attemptNumber} attempts`,
                  {
                    cause: error,
                  }
                )
              );
            } else {
              log.warning(
                `Input token use query failed on attempt ${error.attemptNumber}; retrying... (traceId: ${traceId})`
              );
            }
          },
        });

        return {
          score: inputTokens,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Failed to evaluate token use for trace ${traceId}: ${errorMessage}`);
        return {
          label: 'error',
          explanation: `Failed to retrieve token usage: ${errorMessage}`,
        };
      }
    },
    kind: 'CODE',
    name: 'Input Tokens',
  };
}
