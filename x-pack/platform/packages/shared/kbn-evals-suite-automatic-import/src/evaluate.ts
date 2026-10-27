/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { AutomaticImportClient } from './automatic_import_client';
import { ITERATIONS_EVALUATOR_NAME } from './iterations_evaluator';
import type { EcsFields } from './scoring/ecs_fields';
import { fetchEcsFields } from './scoring/ecs_fields';

interface WorkerFixtures {
  automaticImportClient: AutomaticImportClient;
  ecsFields: EcsFields;
}

export const evaluate = base.extend<{}, WorkerFixtures>({
  automaticImportClient: [
    async ({ fetch, esClient, traceEsClient, log }, use) => {
      await use(new AutomaticImportClient(fetch, esClient, traceEsClient, log));
    },
    { scope: 'worker' },
  ],
  ecsFields: [
    async ({ fetch }, use) => {
      await use(await fetchEcsFields(fetch));
    },
    { scope: 'worker' },
  ],
  reportDisplayOptions: [
    async ({ reportDisplayOptions }, use) => {
      await use({
        ...reportDisplayOptions,
        evaluatorDisplayOptions: new Map([
          ...reportDisplayOptions.evaluatorDisplayOptions,
          [ITERATIONS_EVALUATOR_NAME, { decimalPlaces: 1 }],
        ]),
      });
    },
    { scope: 'worker' },
  ],
});
