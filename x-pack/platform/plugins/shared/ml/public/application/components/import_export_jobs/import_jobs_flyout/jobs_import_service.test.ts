/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JobImportService } from './jobs_import_service';
import type { MlApi } from '../../../services/ml_api_service';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { ImportedAdJob } from './jobs_import_service';

describe('JobImportService', () => {
  let jobImportService: JobImportService;
  let mockEsSearch: jest.MockedFunction<MlApi['esSearch']>;
  let mockValidateDatafeedPreview: jest.MockedFunction<MlApi['validateDatafeedPreview']>;
  let mockGetFilters: jest.Mock;

  beforeEach(() => {
    mockEsSearch = jest.fn();
    mockValidateDatafeedPreview = jest.fn();
    mockGetFilters = jest.fn().mockResolvedValue([]);
    jobImportService = new JobImportService(mockEsSearch, mockValidateDatafeedPreview);
  });

  describe('validateJobs', () => {
    describe('for data-frame-analytics jobs', () => {
      it('should validate jobs with valid source indices', async () => {
        const jobs: DataFrameAnalyticsConfig[] = [
          {
            id: 'test-job-1',
            source: { index: ['valid-index'] },
            dest: { index: 'dest-index' },
            analysis: { outlier_detection: {} },
          } as DataFrameAnalyticsConfig,
        ];

        mockEsSearch.mockResolvedValue({
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        } as any);

        const result = await jobImportService.validateJobs(
          jobs,
          'data-frame-analytics',
          mockGetFilters
        );

        expect(result.jobs).toHaveLength(1);
        expect(result.jobs[0].jobId).toBe('test-job-1');
        expect(result.skippedJobs).toHaveLength(0);
        expect(mockEsSearch).toHaveBeenCalledWith({
          index: ['valid-index'],
          size: 0,
          body: { query: { match_all: {} } },
        });
      });

      it('should skip jobs with missing source indices', async () => {
        const jobs: DataFrameAnalyticsConfig[] = [
          {
            id: 'test-job-1',
            source: { index: ['missing-index'] },
            dest: { index: 'dest-index' },
            analysis: { outlier_detection: {} },
          } as DataFrameAnalyticsConfig,
        ];

        const error = new Error('no such index [missing-index]');
        (error as any).body = {
          error: {
            type: 'index_not_found_exception',
            reason: 'no such index [missing-index]',
          },
        };
        mockEsSearch.mockRejectedValue(error);

        const result = await jobImportService.validateJobs(
          jobs,
          'data-frame-analytics',
          mockGetFilters
        );

        expect(result.jobs).toHaveLength(0);
        expect(result.skippedJobs).toHaveLength(1);
        expect(result.skippedJobs[0].jobId).toBe('test-job-1');
        expect(result.skippedJobs[0].sourceIndicesErrors).toBeDefined();
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].index).toBe('missing-index');
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].error).toContain(
          'no such index [missing-index]'
        );
      });

      it('should skip jobs when index pattern matches no indices', async () => {
        const jobs: DataFrameAnalyticsConfig[] = [
          {
            id: 'test-job-1',
            source: { index: ['pattern-*'] },
            dest: { index: 'dest-index' },
            analysis: { outlier_detection: {} },
          } as DataFrameAnalyticsConfig,
        ];

        mockEsSearch.mockResolvedValue({
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        } as any);

        const result = await jobImportService.validateJobs(
          jobs,
          'data-frame-analytics',
          mockGetFilters
        );

        expect(result.jobs).toHaveLength(0);
        expect(result.skippedJobs).toHaveLength(1);
        expect(result.skippedJobs[0].jobId).toBe('test-job-1');
        expect(result.skippedJobs[0].sourceIndicesErrors).toBeDefined();
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].index).toBe('pattern-*');
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].error).toBe(
          'Index pattern matches no indices'
        );
      });

      it('should skip jobs with empty source indices array', async () => {
        const jobs: DataFrameAnalyticsConfig[] = [
          {
            id: 'test-job-1',
            source: { index: [] },
            dest: { index: 'dest-index' },
            analysis: { outlier_detection: {} },
          } as DataFrameAnalyticsConfig,
        ];

        const result = await jobImportService.validateJobs(
          jobs,
          'data-frame-analytics',
          mockGetFilters
        );

        expect(result.jobs).toHaveLength(0);
        expect(result.skippedJobs).toHaveLength(1);
        expect(result.skippedJobs[0].jobId).toBe('test-job-1');
        expect(result.skippedJobs[0].sourceIndicesErrors).toBeDefined();
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].index).toBeUndefined();
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].error).toBe(
          'Source indices array is empty'
        );
        expect(mockEsSearch).not.toHaveBeenCalled();
      });

      it('should handle multiple indices with mixed validity', async () => {
        const jobs: DataFrameAnalyticsConfig[] = [
          {
            id: 'test-job-1',
            source: { index: ['valid-index', 'missing-index'] },
            dest: { index: 'dest-index' },
            analysis: { outlier_detection: {} },
          } as DataFrameAnalyticsConfig,
        ];

        mockEsSearch
          .mockResolvedValueOnce({
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          } as any)
          .mockRejectedValueOnce({
            body: {
              error: {
                type: 'index_not_found_exception',
                reason: 'no such index [missing-index]',
              },
            },
          });

        const result = await jobImportService.validateJobs(
          jobs,
          'data-frame-analytics',
          mockGetFilters
        );

        expect(result.jobs).toHaveLength(0);
        expect(result.skippedJobs).toHaveLength(1);
        expect(result.skippedJobs[0].sourceIndicesErrors).toHaveLength(1);
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].index).toBe('missing-index');
      });

      it('should skip jobs with both missing filters and invalid indices', async () => {
        const jobs: DataFrameAnalyticsConfig[] = [
          {
            id: 'test-job-1',
            source: { index: ['missing-index'] },
            dest: { index: 'dest-index' },
            analysis: { outlier_detection: {} },
          } as DataFrameAnalyticsConfig,
        ];

        mockGetFilters.mockResolvedValue([{ filter_id: 'existing-filter' }]);
        mockEsSearch.mockRejectedValue({
          body: {
            error: {
              type: 'index_not_found_exception',
              reason: 'no such index [missing-index]',
            },
          },
        });

        const result = await jobImportService.validateJobs(
          jobs,
          'data-frame-analytics',
          mockGetFilters
        );

        expect(result.skippedJobs).toHaveLength(1);
        expect(result.skippedJobs[0].sourceIndicesErrors).toBeDefined();
      });
    });

    describe('for anomaly-detector jobs', () => {
      it('should not validate source indices for AD jobs', async () => {
        const jobs: ImportedAdJob[] = [
          {
            job: {
              job_id: 'ad-job-1',
              analysis_config: { detectors: [] },
            } as any,
            datafeed: {
              datafeed_id: 'datafeed-1',
              job_id: 'ad-job-1',
              indices: ['some-index'],
            } as any,
          },
        ];

        const result = await jobImportService.validateJobs(
          jobs,
          'anomaly-detector',
          mockGetFilters
        );

        expect(result.jobs).toHaveLength(1);
        expect(result.jobs[0].jobId).toBe('ad-job-1');
        expect(mockEsSearch).not.toHaveBeenCalled();
      });
    });
  });

  describe('validateDatafeeds', () => {
    it('should return no warnings for valid datafeeds', async () => {
      const jobs: ImportedAdJob[] = [
        {
          job: { job_id: 'test-job-1' } as any,
          datafeed: { datafeed_id: 'datafeed-1' } as any,
        },
      ];

      mockValidateDatafeedPreview.mockResolvedValue({
        valid: true,
        documentsFound: true,
      } as any);

      const result = await jobImportService.validateDatafeeds(jobs);

      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe('test-job-1');
      expect(result[0].hasWarning).toBe(false);
      expect(result[0].warningMessage).toBeUndefined();
    });

    it('should return warning when datafeed preview returns error', async () => {
      const jobs: ImportedAdJob[] = [
        {
          job: { job_id: 'test-job-1' } as any,
          datafeed: { datafeed_id: 'datafeed-1' } as any,
        },
      ];

      mockValidateDatafeedPreview.mockResolvedValue({
        valid: false,
        error: { message: 'Index not found' },
      } as any);

      const result = await jobImportService.validateDatafeeds(jobs);

      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe('test-job-1');
      expect(result[0].hasWarning).toBe(true);
      expect(result[0].warningMessage).toContain('Unable to validate datafeed preview');
    });

    it('should return warning when datafeed preview is invalid', async () => {
      const jobs: ImportedAdJob[] = [
        {
          job: { job_id: 'test-job-1' } as any,
          datafeed: { datafeed_id: 'datafeed-1' } as any,
        },
      ];

      mockValidateDatafeedPreview.mockResolvedValue({
        valid: false,
        documentsFound: true,
      } as any);

      const result = await jobImportService.validateDatafeeds(jobs);

      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe('test-job-1');
      expect(result[0].hasWarning).toBe(true);
      expect(result[0].warningMessage).toContain('Datafeed preview failed');
    });

    it('should return warning when no documents found', async () => {
      const jobs: ImportedAdJob[] = [
        {
          job: { job_id: 'test-job-1' } as any,
          datafeed: { datafeed_id: 'datafeed-1' } as any,
        },
      ];

      mockValidateDatafeedPreview.mockResolvedValue({
        valid: true,
        documentsFound: false,
      } as any);

      const result = await jobImportService.validateDatafeeds(jobs);

      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe('test-job-1');
      expect(result[0].hasWarning).toBe(true);
      expect(result[0].warningMessage).toContain('Datafeed preview returned no data');
    });

    it('should handle validation errors gracefully', async () => {
      const jobs: ImportedAdJob[] = [
        {
          job: { job_id: 'test-job-1' } as any,
          datafeed: { datafeed_id: 'datafeed-1' } as any,
        },
      ];

      mockValidateDatafeedPreview.mockRejectedValue(new Error('Network error'));

      const result = await jobImportService.validateDatafeeds(jobs);

      expect(result).toHaveLength(1);
      expect(result[0].jobId).toBe('test-job-1');
      expect(result[0].hasWarning).toBe(true);
      expect(result[0].warningMessage).toContain('Unable to validate datafeed preview');
      expect(result[0].warningMessage).toContain('Network error');
    });

    it('should validate multiple jobs in parallel', async () => {
      const jobs: ImportedAdJob[] = [
        {
          job: { job_id: 'test-job-1' } as any,
          datafeed: { datafeed_id: 'datafeed-1' } as any,
        },
        {
          job: { job_id: 'test-job-2' } as any,
          datafeed: { datafeed_id: 'datafeed-2' } as any,
        },
      ];

      mockValidateDatafeedPreview.mockResolvedValue({
        valid: true,
        documentsFound: true,
      } as any);

      const result = await jobImportService.validateDatafeeds(jobs);

      expect(result).toHaveLength(2);
      expect(mockValidateDatafeedPreview).toHaveBeenCalledTimes(2);
    });
  });
});
