/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { datafeedConfigSchema } from './datafeeds_schema';
import { datafeedPreviewSchema } from './job_service_schema';

describe('datafeedConfigSchema', () => {
  it('accepts ES|QL datafeed fields', () => {
    expect(
      datafeedConfigSchema.validate({
        job_id: 'job-1',
        esql_query: 'FROM logs-* | KEEP @timestamp, value',
        source_time_field: '@timestamp',
        grouping_interval: '1h',
      })
    ).toStrictEqual({
      job_id: 'job-1',
      esql_query: 'FROM logs-* | KEEP @timestamp, value',
      source_time_field: '@timestamp',
      grouping_interval: '1h',
    });
  });

  it('rejects unknown fields', () => {
    expect(() => datafeedConfigSchema.validate({ unexpected: 'field' })).toThrow();
  });
});

describe('datafeedPreviewSchema', () => {
  it('accepts explicit string and numeric preview bounds with inline ES|QL config', () => {
    expect(
      datafeedPreviewSchema.validate({
        start: 'now-15m',
        end: 123456789,
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
          esql_query:
            'FROM logs-* | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 hour)',
          source_time_field: '@timestamp',
          grouping_interval: '1h',
        },
      })
    ).toMatchObject({ start: 'now-15m', end: 123456789 });
  });
});
