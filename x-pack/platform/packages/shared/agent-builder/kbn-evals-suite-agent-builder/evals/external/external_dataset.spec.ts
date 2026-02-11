/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateExternalDataset } from '../../src/evaluate_dataset';
import { createEvaluateExternalDataset } from '../../src/evaluate_dataset';

const evaluate = base.extend<{ evaluateExternalDataset: EvaluateExternalDataset }, {}>({
  evaluateExternalDataset: [
    ({ chatClient, evaluators, phoenixClient, traceEsClient, log }, use) => {
      use(
        createEvaluateExternalDataset({
          chatClient,
          evaluators,
          phoenixClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('Default Agent - External Phoenix Dataset', { tag: '@svlSearch' }, () => {
  evaluate.skip(!process.env.DATASET_NAME, 'DATASET_NAME is not set');

  evaluate('external dataset', async ({ evaluateExternalDataset }) => {
    const datasetName = process.env.DATASET_NAME!;
    await evaluateExternalDataset(datasetName);
  });
});
