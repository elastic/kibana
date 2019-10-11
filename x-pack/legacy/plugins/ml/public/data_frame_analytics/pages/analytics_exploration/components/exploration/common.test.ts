/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataFrameAnalyticsConfig } from '../../../../common';

import { getOutlierScoreFieldName } from './common';

describe('Data Frame Analytics: <Exploration /> common utils', () => {
  test('getOutlierScoreFieldName()', () => {
    const jobConfig: DataFrameAnalyticsConfig = {
      id: 'the-id',
      analysis: { outlier_detection: {} },
      dest: {
        index: 'the-dest-index',
        results_field: 'the-results-field',
      },
      source: {
        index: 'the-source-index',
      },
      analyzed_fields: { includes: [], excludes: [] },
      model_memory_limit: '50mb',
      create_time: 1234,
      version: '1.0.0',
    };

    const outlierScoreFieldName = getOutlierScoreFieldName(jobConfig);

    expect(outlierScoreFieldName).toMatch('the-results-field.outlier_score');
  });
});
