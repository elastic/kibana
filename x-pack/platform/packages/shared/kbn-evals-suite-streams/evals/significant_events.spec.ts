/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { evaluate } from '@kbn/evals';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

interface TaskStatusResponse {
  status: string;
  queries?: Array<{ query: string }>;
  error?: string;
}

async function pollUntilComplete(
  fetch: HttpHandler,
  maxAttempts: number = MAX_POLL_ATTEMPTS
): Promise<TaskStatusResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = (await fetch('/api/streams/logs/significant_events/_status', {
      method: 'GET',
    })) as TaskStatusResponse;

    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Task did not complete within the expected time');
}

evaluate.describe('Significant events query generation', { tag: '@svlOblt' }, () => {
  evaluate.beforeEach(async ({ apiServices }) => {
    await apiServices.streams.enable();
  });

  evaluate.afterEach(async ({ apiServices }) => {
    await apiServices.streams.disable();
  });

  evaluate('empty datastream', async ({ phoenixClient, evaluators, connector, fetch }) => {
    await phoenixClient.runExperiment(
      {
        dataset: {
          name: 'sig_events: empty datastream',
          description: 'Significant events query generation with empty stream data',
          examples: [
            {
              input: {},
              output: {},
              metadata: {},
            },
          ],
        },
        task: async ({}) => {
          const now = new Date();
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          // Schedule the generation task
          await fetch('/api/streams/logs/significant_events/_task', {
            method: 'POST',
            body: JSON.stringify({
              action: 'schedule',
              connectorId: connector.id,
              from: oneDayAgo.toISOString(),
              to: now.toISOString(),
            }),
          });

          // Poll until the task completes
          const result = await pollUntilComplete(fetch);

          if (result.status === 'failed') {
            throw new Error(`Task failed: ${result.error}`);
          }

          return result.queries?.map((e) => e.query) ?? [];
        },
      },
      [
        {
          name: 'evaluator',
          kind: 'LLM',
          evaluate: async ({ input, output, expected, metadata }) => {
            const result = await evaluators
              .criteria(['Assert the KQL queries are generated following the user intent'])
              .evaluate({
                input,
                expected,
                output,
                metadata,
              });

            return result;
          },
        },
      ]
    );
  });
});
