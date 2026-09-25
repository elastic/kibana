/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import {
  cleanHostLoadMetrics,
  seedHostLoadMetrics,
  type HostLoadFixture,
} from '../../src/fixtures/host_load_metrics';
import { VISUALIZATION_CREATION_EXAMPLES } from './datasets';

evaluate.describe(
  'Agent Builder Visualizations - Standalone Visualization Creation',
  { tag: tags.serverless.search },
  () => {
    let hostLoadFixture: HostLoadFixture | undefined;

    evaluate.beforeAll(async ({ fetch, esClient, log }) => {
      // allSettled so a failed sample-data install still records the seeded fixture
      // for afterAll to clean up.
      const [logsInstall, ecommerceInstall, hostLoadSeed] = await Promise.allSettled([
        fetch('/api/sample_data/logs', {
          method: 'POST',
          version: '2023-10-31',
        }),
        fetch('/api/sample_data/ecommerce', {
          method: 'POST',
          version: '2023-10-31',
        }),
        seedHostLoadMetrics(esClient, log),
      ]);
      if (hostLoadSeed.status === 'fulfilled') {
        hostLoadFixture = hostLoadSeed.value;
      }
      for (const setupStep of [logsInstall, ecommerceInstall, hostLoadSeed]) {
        if (setupStep.status === 'rejected') {
          throw setupStep.reason;
        }
      }
    });

    evaluate.afterAll(async ({ esClient, log }) => {
      if (!hostLoadFixture) {
        return;
      }
      await cleanHostLoadMetrics(esClient, hostLoadFixture, log);
    });

    evaluate('standalone visualization ES|QL generation', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder visualizations: standalone visualization creation',
          description:
            'Standalone visualization requests over kibana_sample_data_logs, kibana_sample_data_ecommerce, and host metrics. Scores ES|QL validity/equivalence, chart type vs intent, config vs intent, config validity, and result shape.',
          examples: VISUALIZATION_CREATION_EXAMPLES,
        },
      });
    });
  }
);
