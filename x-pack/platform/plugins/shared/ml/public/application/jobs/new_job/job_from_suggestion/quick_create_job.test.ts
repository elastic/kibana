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

  describe('watchProgress', () => {
    const params = {
      jobId: 'my-job',
      timeRange: { start: 1000, end: 5000 },
      runInRealTime: false,
    };

    const progressResponse = (progress: number, isRunning = true, isJobClosed = false) => ({
      progress,
      isRunning,
      isJobClosed,
    });

    const createProgressMlApi = (
      responses: Array<ReturnType<typeof progressResponse>>,
      nodes: Array<string | undefined> = ['node-1']
    ) => {
      const mlApi = createMlApi() as jest.Mocked<MlApi> & {
        jobs: { getLookBackProgress: jest.Mock };
        getJobStats: jest.Mock;
      };
      const getJobStats = jest.fn();
      nodes.forEach((node) => getJobStats.mockResolvedValueOnce({ jobs: [{ node }], count: 1 }));
      getJobStats.mockResolvedValue({ jobs: [{ node: nodes[nodes.length - 1] }], count: 1 });
      const getLookBackProgress = jest.fn();
      responses.forEach((response) => getLookBackProgress.mockResolvedValueOnce(response));
      getLookBackProgress.mockResolvedValue(responses[responses.length - 1]);
      Object.assign(mlApi, { getJobStats, jobs: { getLookBackProgress } });
      return mlApi;
    };

    // Lets the pending promises settle, then runs the timers which they scheduled
    const advance = async (ms: number) => {
      await jest.advanceTimersByTimeAsync(ms);
    };

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('starts at 0, and follows the progress until the job has finished', async () => {
      const mlApi = createProgressMlApi([
        progressResponse(20),
        progressResponse(60),
        progressResponse(100, true, false),
        progressResponse(100, false, true),
      ]);
      const emitted: number[] = [];
      const complete = jest.fn();
      createCreator(mlApi)
        .watchProgress(params)
        .subscribe({ next: (p) => emitted.push(p), complete });

      await advance(0);
      expect(emitted).toEqual([0, 20]);
      await advance(250);
      expect(emitted).toEqual([0, 20, 60]);
      // 100 is only reached once the job is not running any more
      await advance(250);
      expect(emitted).toEqual([0, 20, 60, 99]);
      expect(complete).not.toHaveBeenCalled();
      await advance(250);
      expect(emitted).toEqual([0, 20, 60, 99, 100]);
      expect(complete).toHaveBeenCalledTimes(1);
      expect(mlApi.jobs.getLookBackProgress).toHaveBeenCalledWith('my-job', 1000, 5000);
    });

    it('waits for the job to be assigned to a node before it follows the progress', async () => {
      const mlApi = createProgressMlApi([progressResponse(10)], [undefined, undefined, 'node-1']);
      const emitted: number[] = [];
      createCreator(mlApi)
        .watchProgress(params)
        .subscribe((p) => emitted.push(p));

      await advance(0);
      expect(emitted).toEqual([0]);
      expect(mlApi.jobs.getLookBackProgress).not.toHaveBeenCalled();
      await advance(2000);
      expect(mlApi.jobs.getLookBackProgress).not.toHaveBeenCalled();
      await advance(2000);
      expect(emitted).toEqual([0, 10]);
    });

    it('completes when a job left running in real time has caught up', async () => {
      const mlApi = createProgressMlApi([progressResponse(50), progressResponse(100, true, false)]);
      const emitted: number[] = [];
      const complete = jest.fn();
      createCreator(mlApi)
        .watchProgress({ ...params, runInRealTime: true })
        .subscribe({ next: (p) => emitted.push(p), complete });

      await advance(250);
      expect(emitted).toEqual([0, 50, 100]);
      expect(complete).toHaveBeenCalledTimes(1);
    });

    it('stops checking when it is unsubscribed from', async () => {
      const mlApi = createProgressMlApi([progressResponse(10)]);
      const subscription = createCreator(mlApi).watchProgress(params).subscribe();

      await advance(0);
      const checks = mlApi.jobs.getLookBackProgress.mock.calls.length;
      subscription.unsubscribe();
      await advance(5000);

      expect(mlApi.jobs.getLookBackProgress).toHaveBeenCalledTimes(checks);
    });

    it('errors when the progress cannot be loaded', async () => {
      const mlApi = createProgressMlApi([progressResponse(10)]);
      mlApi.jobs.getLookBackProgress.mockReset();
      mlApi.jobs.getLookBackProgress.mockRejectedValue(new Error('boom'));
      const error = jest.fn();
      createCreator(mlApi).watchProgress(params).subscribe({ error });

      await advance(0);
      expect(error).toHaveBeenCalledWith(new Error('boom'));
    });
  });
});
