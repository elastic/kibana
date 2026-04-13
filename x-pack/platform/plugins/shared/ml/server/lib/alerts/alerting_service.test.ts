/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import type { MlAnomalyRecordDoc, MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import { ML_ANOMALY_RESULT_TYPE } from '@kbn/ml-anomaly-utils';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import type { DeepPartial } from '@kbn/utility-types';
import type { MlClient } from '../ml_client';
import type { DatafeedsService } from '../../models/job_service/datafeeds';
import type { FieldFormatsRegistryProvider } from '../../../common/types/kibana';
import type { GetDataViewsService } from '../data_views_utils';
import { alertingServiceProvider } from './alerting_service';
import type { MlAnomalyDetectionAlertPreviewRequest } from '../../routes/schemas/alerting_schema';

const recordSource: MlAnomalyRecordDoc = {
  job_id: 'test_job',
  result_type: 'record',
  probability: 0.012818,
  record_score: 97.94245,
  initial_record_score: 97,
  bucket_span: 900,
  detector_index: 0,
  is_interim: false,
  timestamp: 1517472900000,
  by_field_name: 'clientip',
  by_field_value: '157.56.93.83',
  function: 'time_of_day',
  function_description: 'time',
  actual: [73781],
  typical: [72000],
};

const getAlertParams = (resultType: MlAnomalyResultType) => ({
  jobSelection: { jobIds: ['test_job'], groupIds: [] },
  severity: 50,
  resultType,
  includeInterim: false,
  lookbackInterval: '1h',
  topNBuckets: 1,
  kqlQueryString: null,
});

const getPreviewRequest = (): MlAnomalyDetectionAlertPreviewRequest => ({
  alertParams: getAlertParams(ML_ANOMALY_RESULT_TYPE.RECORD),
  timeRange: '1h',
  sampleSize: 1,
});

const getJobsResponse = (): MlJob[] => [
  {
    job_id: 'test_job',
    analysis_config: {
      bucket_span: '15m',
      detectors: [
        {
          detector_index: 0,
          function: 'time_of_day',
          detector_description: 'time_of_day',
        },
      ],
    },
  } as unknown as MlJob,
];

const getAggregations = (): Record<string, unknown> => ({
  alerts_over_time: {
    buckets: [
      {
        doc_count: 1,
        key: recordSource.timestamp,
        key_as_string: new Date(recordSource.timestamp).toISOString(),
        record_results: {
          doc_count: 1,
          top_record_hits: {
            hits: {
              hits: [{ _source: recordSource }],
            },
          },
        },
        bucket_results: {
          doc_count: 0,
          top_bucket_hits: {
            hits: {
              hits: [],
            },
          },
        },
        influencer_results: {
          doc_count: 0,
          top_influencer_hits: {
            hits: {
              hits: [],
            },
          },
        },
      },
    ],
  },
});

const createService = () => {
  const mlClient = {
    getJobs: jest.fn().mockResolvedValue({ jobs: getJobsResponse() }),
    anomalySearch: jest.fn().mockResolvedValue({ aggregations: getAggregations() }),
  } as unknown as jest.Mocked<MlClient>;

  const datafeedsService = {
    getDatafeedByJobId: jest.fn().mockResolvedValue([
      {
        job_id: 'test_job',
        datafeed_id: 'datafeed-test_job',
        indices: ['test-index'],
      },
    ]),
  } as unknown as jest.Mocked<DatafeedsService>;

  const getFieldsFormatRegistry = jest.fn().mockResolvedValue({
    deserialize: jest
      .fn()
      .mockImplementation(({ id }: { id: string } | DeepPartial<{ id: string }>) => {
        if (id === 'date') {
          return {
            convert: jest
              .fn()
              .mockImplementation(
                (value: number, _type?: string, options?: { timezone?: string }) =>
                  moment.tz(value, options?.timezone ?? 'UTC').format('YYYY-MM-DD HH:mm')
              ),
          };
        }

        return {
          convert: jest.fn().mockImplementation((value: number) => value.toString()),
        };
      }),
  }) as jest.Mocked<FieldFormatsRegistryProvider>;

  const getDataViewsService = jest.fn().mockResolvedValue({
    findLazy: jest.fn().mockResolvedValue([]),
  }) as jest.Mocked<GetDataViewsService>;

  return alertingServiceProvider(
    mlClient,
    datafeedsService,
    getFieldsFormatRegistry,
    getDataViewsService
  );
};

describe('alertingServiceProvider preview formatting', () => {
  test('formats time values in preview context in UTC regardless of configured timezone', async () => {
    const service = createService();

    const result = await service.preview(getPreviewRequest());

    expect(result.results[0].topRecords[0].typical).toEqual(['Thu 2018-02-01 20:00 UTC']);
    expect(result.results[0].topRecords[0].actual).toEqual(['Thu 2018-02-01 20:29 UTC']);
  });

  test('formats time values in UTC consistently', async () => {
    const service = createService();

    const result = await service.preview(getPreviewRequest());

    expect(result.results[0].topRecords[0].actual).toEqual(['Thu 2018-02-01 20:29 UTC']);
  });
});
