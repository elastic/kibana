/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '@kbn/evals';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { from, lastValueFrom, toArray } from 'rxjs';

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
          const events$ = await lastValueFrom(
            from(
              fetch('/api/streams/logs/significant_events/_generate', {
                method: 'GET',
                asResponse: true,
                rawResponse: true,
                query: {
                  connectorId: connector.id,
                },
              })
            ).pipe(httpResponseIntoObservable(), toArray())
          );

          return events$.map((e) => e.query);
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
