/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { createMicroReporter, type MicroExperiment } from './report';

export const evaluate = base.extend<{}, { microExperiments: MicroExperiment[] }>({
  microExperiments: [
    async ({}, use) => {
      await use([]);
    },
    { scope: 'worker' },
  ],
  reportModelScore: [
    async ({ microExperiments, reportDisplayOptions }, use) => {
      const resultsUrl = process.env.EVAL_KBN_URL;
      if (!resultsUrl) throw new Error('Select a results-cluster profile with evaluationsKbn.url.');
      await use(
        createMicroReporter({ experiments: microExperiments, resultsUrl, reportDisplayOptions })
      );
    },
    { scope: 'worker' },
  ],
});
