/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '@kbn/evals';

evaluate(
  'basic inference client smoke',
  { tag: ['@ess'] },
  async ({ inferenceClient, phoenixClient, evaluators }) => {
    const dataset = {
      name: 'my-dataset',
      description: 'my-description',
      examples: [
        {
          input: {
            content: 'Hi',
          },
          output: {
            content: 'Hey',
          },
        },
      ],
    };

    await phoenixClient.runExperiment({
      dataset,
      evaluators: [],
      task: async ({ input }) => {
        return (
          await inferenceClient.output({
            id: 'foo',
            input: input.content as string,
          })
        ).content;
      },
    });
  }
);
