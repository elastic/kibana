/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDatafeedPreviewRequest } from './datafeed_preview_request';

describe('createDatafeedPreviewRequest', () => {
  it('passes exact string bounds and inline ES|QL configs to the Elasticsearch client', () => {
    const request = createDatafeedPreviewRequest({
      start: 'now-15m',
      end: 'now',
      job: {
        job_id: 'preview-esql-job',
        analysis_config: {
          bucket_span: '1h',
          detectors: [{ function: 'mean', field_name: 'avg_bytes' }],
          influencers: [],
        },
        data_description: { time_field: 'bucket' },
      },
      datafeed: {
        datafeed_id: 'preview-esql-datafeed',
        job_id: 'preview-esql-job',
        esql_query: 'FROM logs-* | STATS avg_bytes = AVG(bytes)',
        source_time_field: '@timestamp',
        grouping_interval: '1h',
      },
    });

    expect(request).toStrictEqual({
      start: 'now-15m',
      end: 'now',
      body: {
        job_config: {
          job_id: 'preview-esql-job',
          analysis_config: {
            bucket_span: '1h',
            detectors: [{ function: 'mean', field_name: 'avg_bytes' }],
            influencers: [],
          },
          data_description: { time_field: 'bucket' },
        },
        datafeed_config: {
          datafeed_id: 'preview-esql-datafeed',
          job_id: 'preview-esql-job',
          esql_query: 'FROM logs-* | STATS avg_bytes = AVG(bytes)',
          source_time_field: '@timestamp',
          grouping_interval: '1h',
        },
      },
    });
  });
});
