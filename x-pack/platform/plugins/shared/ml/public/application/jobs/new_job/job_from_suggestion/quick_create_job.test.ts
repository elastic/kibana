/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { CREATED_BY_LABEL, JOB_TYPE } from '../../../../../common/constants/new_job';
import type { JobSuggestion } from '../../../../../common/types/job_suggestions';
import type { MlApi } from '../../../services/ml_api_service';
import { QuickSuggestedJobCreator } from './quick_create_job';

jest.mock('../../../services/ml_server_info', () => ({
  getIsMlCpsEnabled: () => false,
}));

const suggestion: JobSuggestion = {
  id: 'suggestion-1',
  title: 'Unusual response times',
  description: 'Looks for response times which are unusual for a service.',
  jobType: JOB_TYPE.MULTI_METRIC,
  job: {
    job_id: 'ai-response-times-1a2b',
    description: 'Response times',
    analysis_config: {
      bucket_span: '15m',
      detectors: [{ function: 'high_mean', field_name: 'responsetime' }],
      influencers: ['service'],
    },
    data_description: { time_field: '@timestamp' },
    custom_settings: { created_by: CREATED_BY_LABEL.MULTI_METRIC },
  },
  datafeed: {
    datafeed_id: 'datafeed-ai-response-times-1a2b',
    job_id: 'ai-response-times-1a2b',
    indices: ['logs-*'],
    query: { bool: { must: [{ match_all: {} }] } },
  },
  validation: { status: 'valid', messages: [] },
};

const createMlApi = () =>
  ({
    getTimeFieldRange: jest.fn().mockResolvedValue({
      success: true,
      start: 1000,
      end: 5000,
    }),
    calculateModelMemoryLimit$: jest.fn(() => of({ modelMemoryLimit: '20MB' })),
    addJob: jest.fn().mockResolvedValue({}),
    addDatafeed: jest.fn().mockResolvedValue({}),
    openJob: jest.fn().mockResolvedValue({}),
    startDatafeed: jest.fn().mockResolvedValue({}),
  } as unknown as jest.Mocked<MlApi>);

const createCreator = (mlApi: MlApi) =>
  new QuickSuggestedJobCreator(
    {} as DataViewsContract,
    {} as IUiSettingsClient,
    {} as TimefilterContract,
    {} as SharePluginStart,
    mlApi
  );

describe('QuickSuggestedJobCreator', () => {
  describe('getFullTimeRange', () => {
    it('asks for the range of the data which the datafeed reads', async () => {
      const mlApi = createMlApi();

      const range = await createCreator(mlApi).getFullTimeRange(suggestion);

      expect(range).toEqual({ start: 1000, end: 5000 });
      expect(mlApi.getTimeFieldRange).toHaveBeenCalledWith({
        index: 'logs-*',
        timeFieldName: '@timestamp',
        query: suggestion.datafeed.query,
      });
    });
  });

  describe('createAndSaveJob', () => {
    const params = {
      suggestion,
      jobId: 'my-job',
      timeRange: { start: 1000, end: 5000 },
      startJob: true,
      runInRealTime: false,
    };

    it('creates the job and datafeed with the chosen job id, then starts them', async () => {
      const mlApi = createMlApi();

      const result = await createCreator(mlApi).createAndSaveJob(params);

      expect(result).toEqual({
        jobCreated: { success: true },
        datafeedCreated: { success: true },
        jobOpened: { success: true },
        datafeedStarted: { success: true },
      });
      expect(mlApi.addJob).toHaveBeenCalledWith({
        jobId: 'my-job',
        job: expect.objectContaining({
          job_id: 'my-job',
          analysis_config: suggestion.job.analysis_config,
          analysis_limits: { model_memory_limit: '20MB' },
          custom_settings: { created_by: CREATED_BY_LABEL.MULTI_METRIC },
        }),
      });
      expect(mlApi.addDatafeed).toHaveBeenCalledWith({
        datafeedId: 'datafeed-my-job',
        datafeedConfig: expect.objectContaining({
          job_id: 'my-job',
          datafeed_id: 'datafeed-my-job',
          indices: ['logs-*'],
        }),
      });
      expect(mlApi.openJob).toHaveBeenCalledWith({ jobId: 'my-job' });
    });

    it('does not change the suggestion', async () => {
      const before = JSON.stringify(suggestion);

      await createCreator(createMlApi()).createAndSaveJob(params);

      expect(JSON.stringify(suggestion)).toBe(before);
    });

    it('stops the datafeed at the end of the time range', async () => {
      const mlApi = createMlApi();

      await createCreator(mlApi).createAndSaveJob(params);

      expect(mlApi.startDatafeed).toHaveBeenCalledWith({
        datafeedId: 'datafeed-my-job',
        start: 1000,
        end: 5000,
      });
    });

    it('leaves the datafeed running when it is to run in real time', async () => {
      const mlApi = createMlApi();

      await createCreator(mlApi).createAndSaveJob({ ...params, runInRealTime: true });

      expect(mlApi.startDatafeed).toHaveBeenCalledWith({
        datafeedId: 'datafeed-my-job',
        start: 1000,
      });
    });

    it('stops at the job when it cannot be created', async () => {
      const mlApi = createMlApi();
      mlApi.addJob.mockRejectedValue(new Error('exists'));

      const result = await createCreator(mlApi).createAndSaveJob(params);

      expect(result.jobCreated.success).toBe(false);
      expect(mlApi.addDatafeed).not.toHaveBeenCalled();
      expect(mlApi.startDatafeed).not.toHaveBeenCalled();
    });

    it('does not open or start the job when told not to', async () => {
      const mlApi = createMlApi();

      const result = await createCreator(mlApi).createAndSaveJob({ ...params, startJob: false });

      expect(result.datafeedCreated.success).toBe(true);
      expect(mlApi.openJob).not.toHaveBeenCalled();
      expect(mlApi.startDatafeed).not.toHaveBeenCalled();
    });
  });
});
