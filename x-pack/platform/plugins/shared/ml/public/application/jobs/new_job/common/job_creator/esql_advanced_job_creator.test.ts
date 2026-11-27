/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../../services/ml_api_service';
import { mlJobCapsServiceFactory } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { CREATED_BY_LABEL, JOB_TYPE } from '../../../../../../common/constants/new_job';
import { EsqlAdvancedJobCreator } from './esql_advanced_job_creator';

const createJobCreator = () =>
  new EsqlAdvancedJobCreator({} as MlApi, mlJobCapsServiceFactory({} as MlApi));

const columns = [
  { name: 'bucket', type: 'date' },
  { name: 'doc_count', type: 'long' },
  { name: 'http.response.status_code', type: 'long' },
  { name: 'sources', type: 'keyword' },
];

const customRules = [{ actions: ['skip_result' as const], conditions: [] }];

const job = {
  job_id: 'esql-job',
  analysis_config: {
    bucket_span: '1m',
    summary_count_field_name: 'doc_count',
    detectors: [
      {
        function: 'high_count',
        by_field_name: 'http.response.status_code',
        custom_rules: customRules,
      },
    ],
    influencers: ['sources'],
  },
  data_description: { time_field: 'bucket' },
} as unknown as Job;

const datafeed = {
  datafeed_id: 'datafeed-esql-job',
  job_id: 'esql-job',
  esql_query:
    'FROM logs-* | STATS doc_count = COUNT(*), sources = VALUES(source.address) BY bucket = BUCKET(@timestamp, 1 minute), http.response.status_code',
} as Datafeed;

describe('EsqlAdvancedJobCreator', () => {
  it('is the advanced ES|QL wizard job type, with an ES|QL datafeed', () => {
    const jobCreator = createJobCreator();

    expect(jobCreator.type).toBe(JOB_TYPE.ESQL_ADVANCED);
    expect(jobCreator.createdBy).toBe(CREATED_BY_LABEL.ESQL_ADVANCED);
    expect(jobCreator.datafeedConfig.query).toBeUndefined();
    expect(jobCreator.datafeedConfig.indices).toBeUndefined();
  });

  it('adds, edits and removes detectors with their own split fields', () => {
    const jobCreator = createJobCreator();
    jobCreator.setEsqlColumns(columns, {});
    const { newJobCapsService } = jobCreator;
    const count = newJobCapsService.getAggById('count')!;
    const highCount = newJobCapsService.getAggById('high_count')!;
    const eventRate = newJobCapsService.getFieldById('__ml_event_rate_count__')!;
    const statusCode = newJobCapsService.getFieldById('http.response.status_code');

    jobCreator.addDetector(count, eventRate, statusCode, null, null, null, null, null);
    expect(jobCreator.detectors).toEqual([
      { function: 'count', by_field_name: 'http.response.status_code' },
    ]);
    expect(jobCreator.richDetectors[0].byField?.id).toBe('http.response.status_code');

    jobCreator.editDetector(highCount, eventRate, null, null, statusCode, null, 'desc', 0, null);
    expect(jobCreator.detectors).toEqual([
      {
        function: 'high_count',
        partition_field_name: 'http.response.status_code',
        detector_description: 'desc',
      },
    ]);
    expect(jobCreator.richDetectors[0].partitionField?.id).toBe('http.response.status_code');

    jobCreator.removeDetector(0);
    expect(jobCreator.detectors).toEqual([]);
    expect(jobCreator.richDetectors).toEqual([]);
  });

  it('restores cloned detectors with their custom rules once the query columns are set', () => {
    const jobCreator = createJobCreator();
    jobCreator.cloneFromExistingJob(structuredClone(job), structuredClone(datafeed));
    expect(jobCreator.richDetectors).toEqual([]);

    jobCreator.setEsqlColumns(columns, {});

    expect(jobCreator.detectors).toEqual([
      {
        function: 'high_count',
        by_field_name: 'http.response.status_code',
        custom_rules: customRules,
      },
    ]);
    expect(jobCreator.richDetectors).toHaveLength(1);
    expect(jobCreator.richDetectors[0].customRules).toEqual(customRules);
    expect(jobCreator.createdBy).toBe(CREATED_BY_LABEL.ESQL_ADVANCED);
  });

  it('restores detectors straight away when edited JSON is saved after the query step', () => {
    const jobCreator = createJobCreator();
    jobCreator.setEsqlColumns(columns, {});

    jobCreator.cloneFromExistingJob(structuredClone(job), structuredClone(datafeed));

    expect(jobCreator.richDetectors).toHaveLength(1);
    expect(jobCreator.richDetectors[0].agg?.id).toBe('high_count');
  });

  describe('categorization', () => {
    const categorizationJob = {
      ...job,
      analysis_config: {
        ...job.analysis_config,
        categorization_field_name: 'message',
        detectors: [
          { function: 'count', by_field_name: 'mlcategory' },
          { function: 'high_count', by_field_name: 'http.response.status_code' },
        ],
      },
    } as unknown as Job;

    it('keeps the categorization field and its detectors when the query returns the field', () => {
      const jobCreator = createJobCreator();
      jobCreator.cloneFromExistingJob(
        structuredClone(categorizationJob),
        structuredClone(datafeed)
      );

      jobCreator.setEsqlColumns([...columns, { name: 'message', type: 'keyword' }], {});

      expect(jobCreator.categorizationFieldName).toBe('message');
      expect(jobCreator.detectors).toEqual([
        { function: 'count', by_field_name: 'mlcategory' },
        { function: 'high_count', by_field_name: 'http.response.status_code' },
      ]);
    });

    it('drops the categorization field and its detectors when the query no longer returns it', () => {
      const jobCreator = createJobCreator();
      jobCreator.cloneFromExistingJob(
        structuredClone(categorizationJob),
        structuredClone(datafeed)
      );

      jobCreator.setEsqlColumns(columns, {});

      expect(jobCreator.categorizationFieldName).toBeNull();
      expect(jobCreator.jobConfig.analysis_config.categorization_field_name).toBeUndefined();
      expect(jobCreator.detectors).toEqual([
        { function: 'high_count', by_field_name: 'http.response.status_code' },
      ]);
    });
  });
});
