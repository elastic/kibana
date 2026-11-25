/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../../services/ml_api_service';
import {
  mlJobCapsServiceFactory,
  type NewJobCapsService,
} from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { CREATED_BY_LABEL, JOB_TYPE } from '../../../../../../common/constants/new_job';
import { EsqlBasicJobCreator } from './esql_basic_job_creator';

const createJobCreator = (newJobCapsService = {} as NewJobCapsService) =>
  new EsqlBasicJobCreator({} as MlApi, newJobCapsService);

const columns = [
  { name: 'timestamp', type: 'date' },
  { name: 'host', type: 'keyword' },
  { name: 'avg_bytes', type: 'double' },
];

const job = {
  job_id: 'esql-job',
  analysis_config: {
    bucket_span: '1h',
    detectors: [
      { function: 'mean', field_name: 'avg_bytes', partition_field_name: 'host' },
      { function: 'max', field_name: 'dropped_column', partition_field_name: 'host' },
    ],
    influencers: ['host'],
  },
  data_description: { time_field: 'timestamp' },
} as unknown as Job;

const datafeed = {
  datafeed_id: 'datafeed-esql-job',
  job_id: 'esql-job',
  esql_query:
    'FROM logs | STATS avg_bytes = AVG(bytes) BY timestamp = BUCKET(@timestamp, 1 hour), host',
} as Datafeed;

describe('EsqlBasicJobCreator', () => {
  it('is the basic ES|QL wizard job type', () => {
    const jobCreator = createJobCreator();

    expect(jobCreator.type).toBe(JOB_TYPE.ESQL_BASIC);
    expect(jobCreator.createdBy).toBe(CREATED_BY_LABEL.ESQL_BASIC);
  });

  it('turns on the delayed data check when the query has a count column', () => {
    const jobCreator = createJobCreator();
    jobCreator.summaryCountFieldName = 'event_count';

    expect(jobCreator.jobConfig.analysis_config.summary_count_field_name).toBe('event_count');
    expect(jobCreator.datafeedConfig.delayed_data_check_config).toEqual({ enabled: true });
  });

  it('turns off the delayed data check without a count column', () => {
    const jobCreator = createJobCreator();
    expect(jobCreator.datafeedConfig.delayed_data_check_config).toEqual({ enabled: false });

    jobCreator.summaryCountFieldName = 'event_count';
    jobCreator.summaryCountFieldName = null;

    expect(jobCreator.jobConfig.analysis_config.summary_count_field_name).toBeUndefined();
    expect(jobCreator.datafeedConfig.delayed_data_check_config).toEqual({ enabled: false });
  });

  it('locks the bucket span to the query interval until the query has none', () => {
    const jobCreator = createJobCreator();
    expect(jobCreator.isBucketSpanFromQuery).toBe(false);

    jobCreator.setBucketSpanFromQuery('1h');
    expect(jobCreator.isBucketSpanFromQuery).toBe(true);
    expect(jobCreator.bucketSpan).toBe('1h');
    expect(jobCreator.datafeedConfig.grouping_interval).toBe('1h');

    jobCreator.setBucketSpanFromQuery(null);
    expect(jobCreator.isBucketSpanFromQuery).toBe(false);
    expect(jobCreator.bucketSpan).toBe('1h');
  });

  it('has no DSL query or indices in its datafeed', () => {
    const { datafeedConfig } = createJobCreator();

    expect(datafeedConfig.query).toBeUndefined();
    expect(datafeedConfig.indices).toBeUndefined();
  });

  it('restores cloned detectors and the split field once the query columns are set', () => {
    const jobCreator = createJobCreator(mlJobCapsServiceFactory({} as MlApi));
    jobCreator.cloneFromExistingJob(structuredClone(job), structuredClone(datafeed));
    // the columns are not known yet, so the cloned detectors are kept as they are
    expect(jobCreator.detectors).toHaveLength(2);

    jobCreator.setEsqlColumns(columns, {
      avg_bytes: [
        ML_JOB_AGGREGATION.MEAN,
        ML_JOB_AGGREGATION.HIGH_MEAN,
        ML_JOB_AGGREGATION.LOW_MEAN,
      ],
    });

    // the detector on a column the query no longer has is removed
    expect(jobCreator.detectors).toEqual([
      { function: 'mean', field_name: 'avg_bytes', partition_field_name: 'host' },
    ]);
    expect(jobCreator.aggFieldPairs.map(({ agg, field }) => [agg.id, field.id])).toEqual([
      ['mean', 'avg_bytes'],
    ]);
    expect(jobCreator.splitField?.id).toBe('host');
    expect(jobCreator.datafeedConfig.indices).toBeUndefined();
    expect(jobCreator.createdBy).toBe(CREATED_BY_LABEL.ESQL_BASIC);
  });
});
