/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detector } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import { buildEsqlJobPayload, createDetectors } from './esql_job_creator';

describe('buildEsqlJobPayload', () => {
  const detectors: Detector[] = [{ function: 'mean', field_name: 'avg_bytes' }];

  const input = {
    jobId: 'job-1',
    datafeedId: 'datafeed-job-1',
    query:
      'FROM logs-* | STATS avg_bytes = AVG(bytes) BY host, bucket = BUCKET(@timestamp, 1 hour)',
    sourceTimeField: '@timestamp',
    timeField: 'bucket',
    bucketSpan: '1h',
    detectors,
    influencers: ['host'],
  };

  it('builds separate minimal job and ES|QL datafeed bodies', () => {
    expect(buildEsqlJobPayload(input)).toStrictEqual({
      job: {
        job_id: 'job-1',
        analysis_config: {
          bucket_span: '1h',
          detectors,
          influencers: ['host'],
        },
        data_description: { time_field: 'bucket' },
      },
      datafeed: {
        datafeed_id: 'datafeed-job-1',
        job_id: 'job-1',
        esql_query: input.query,
        source_time_field: '@timestamp',
        grouping_interval: '1h',
      },
    });
  });

  it('copies the explicit bucket span to the datafeed grouping interval without query inference', () => {
    const payload = buildEsqlJobPayload({
      ...input,
      bucketSpan: '30m',
      query:
        'FROM logs-* | STATS avg_bytes = AVG(bytes) BY host, bucket = BUCKET(@timestamp, 1 hour)',
    });

    expect(payload.job.analysis_config.bucket_span).toBe('30m');
    expect(payload.datafeed.grouping_interval).toBe('30m');
    expect(payload.job.analysis_config.detectors).toBe(detectors);
    expect(payload.job.analysis_config.influencers).toBe(input.influencers);
  });

  it('includes the summary count field only when supplied', () => {
    expect(
      buildEsqlJobPayload({ ...input, summaryCountFieldName: 'doc_count' }).job.analysis_config
    ).toStrictEqual({
      bucket_span: '1h',
      detectors,
      influencers: ['host'],
      summary_count_field_name: 'doc_count',
    });

    expect(buildEsqlJobPayload(input).job.analysis_config).not.toHaveProperty(
      'summary_count_field_name'
    );
  });

  it('does not emit classic datafeed fields', () => {
    const { datafeed } = buildEsqlJobPayload(input);

    [
      'indices',
      'indexes',
      'query',
      'aggregations',
      'aggs',
      'script_fields',
      'runtime_mappings',
      'indices_options',
      'scroll_size',
    ].forEach((field) => expect(datafeed).not.toHaveProperty(field));
  });

  it('omits project routing so the datafeed searches all linked projects', () => {
    const { datafeed: putBody } = buildEsqlJobPayload(input);

    expect(putBody).not.toHaveProperty('project_routing');
  });

  it('includes delayed_data_check_config.enabled only when explicitly supplied', () => {
    expect(
      buildEsqlJobPayload({ ...input, delayedDataCheckEnabled: true }).datafeed
    ).toHaveProperty('delayed_data_check_config', { enabled: true });

    expect(
      buildEsqlJobPayload({ ...input, delayedDataCheckEnabled: false }).datafeed
    ).toHaveProperty('delayed_data_check_config', { enabled: false });

    expect(buildEsqlJobPayload(input).datafeed).not.toHaveProperty('delayed_data_check_config');
  });

  it('includes description only when supplied and non-empty', () => {
    expect(buildEsqlJobPayload({ ...input, description: 'my job' }).job).toHaveProperty(
      'description',
      'my job'
    );
    expect(buildEsqlJobPayload({ ...input, description: '' }).job).not.toHaveProperty(
      'description'
    );
    expect(buildEsqlJobPayload(input).job).not.toHaveProperty('description');
  });

  it('includes groups only when supplied and non-empty', () => {
    expect(buildEsqlJobPayload({ ...input, groups: ['team-a', 'team-b'] }).job).toHaveProperty(
      'groups',
      ['team-a', 'team-b']
    );
    expect(buildEsqlJobPayload({ ...input, groups: [] }).job).not.toHaveProperty('groups');
    expect(buildEsqlJobPayload(input).job).not.toHaveProperty('groups');
  });
});

describe('createDetectors', () => {
  it('maps each detector config to the API detector shape, omitting unset fields', () => {
    expect(
      createDetectors([
        { function: 'mean', field: 'avg_bytes' },
        { function: 'mean', field: 'latency' },
      ])
    ).toStrictEqual([
      { function: 'mean', field_name: 'avg_bytes' },
      { function: 'mean', field_name: 'latency' },
    ]);
  });

  it('omits field_name for functions that do not take a field', () => {
    expect(createDetectors([{ function: 'count' }])).toStrictEqual([{ function: 'count' }]);
  });

  it('maps by/over/partition field when supplied, forward-compatible with the staged wizard', () => {
    expect(
      createDetectors([
        {
          function: 'rare',
          byField: 'host',
          overField: 'region',
          partitionField: 'env',
        },
      ])
    ).toStrictEqual([
      {
        function: 'rare',
        by_field_name: 'host',
        over_field_name: 'region',
        partition_field_name: 'env',
      },
    ]);
  });
});
