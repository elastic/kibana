/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { DASHBOARD_ML_PANEL_EXAMPLES, ML_PANEL_JOB_IDS } from './datasets';

evaluate.describe('Agent Builder Dashboards - ML Panels', { tag: tags.serverless.search }, () => {
  evaluate.beforeAll(async ({ fetch, esClient }) => {
    await fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' });

    // Created through Kibana's ML API, not `esClient.ml.putJob`, so the jobs are registered
    // in the default space and the panels can load them. The jobs have no datafeed.
    for (const jobId of ML_PANEL_JOB_IDS) {
      await esClient.ml.deleteJob({ job_id: jobId, force: true }).catch(() => {});
      await fetch(`/internal/ml/anomaly_detectors/${jobId}`, {
        method: 'PUT',
        version: '1',
        body: JSON.stringify({
          description: 'Agent Builder dashboards eval job',
          analysis_config: { bucket_span: '15m', detectors: [{ function: 'count' }] },
          data_description: { time_field: '@timestamp' },
        }),
      });
    }
  });

  evaluate.afterAll(async ({ esClient }) => {
    for (const jobId of ML_PANEL_JOB_IDS) {
      await esClient.ml.deleteJob({ job_id: jobId, force: true }).catch(() => {});
    }
  });

  evaluate(
    'reads the ML panel config references before writing ML panels',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder dashboards: ML panels',
          description:
            'Dashboard requests for ML anomaly panels, whose config schemas are only in skill references. Scored by Dashboard Panel Config Reference, plus routing and trajectory.',
          examples: DASHBOARD_ML_PANEL_EXAMPLES,
        },
      });
    }
  );
});
