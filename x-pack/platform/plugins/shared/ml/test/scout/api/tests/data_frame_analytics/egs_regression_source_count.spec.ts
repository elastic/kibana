/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pins the exact document count of the ft_egs_regression fixture at the data layer.
 * The UI test (regression_creation.spec.ts) only confirms that the counts
 * section renders a digit — the exact value belongs here where it can fail fast
 * and without running a DFA job.
 */

import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest } from '../../fixtures';

apiTest.describe(
  'egs_regression source index document count',
  {
    tag: ['@local-stateful-classic'],
  },
  () => {
    apiTest.beforeAll(async ({ esArchiver }) => {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/egs_regression');
    });

    apiTest('ft_egs_regression has exactly 2000 documents', async ({ esClient }) => {
      const result = await esClient.count({ index: 'ft_egs_regression' });
      expect(result.count).toBe(2000);
    });
  }
);
