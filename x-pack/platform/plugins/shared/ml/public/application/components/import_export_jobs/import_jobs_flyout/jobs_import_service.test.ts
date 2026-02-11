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

function createIndexNotFoundError(indexName: string) {
  return new Error(`no such index [${indexName}]`);
}

function createBaseAdJob(overrides?: {
  jobId?: string;
  indices?: string[];
  detectors?: any[];
}): ImportedAdJob {
  const jobId = overrides?.jobId ?? 'test-job-1';
  return {
    job: {
      job_id: jobId,
      analysis_config: {
        detectors: overrides?.detectors ?? [],
      },
      allow_lazy_open: false,
      data_description: {
        time_field: 'timestamp',
      },
      model_snapshot_retention_days: 10,
      results_index_name: 'results-index',
    },
    datafeed: {
      datafeed_id: `datafeed-${jobId}`,
      job_id: jobId,
      indices: overrides?.indices ?? ['valid-index'],
      query: {},
      delayed_data_check_config: {
        enabled: true,
      },
    },
  };
}

function createBaseDfaJob(overrides?: {
  jobId?: string;
  sourceIndices?: string[];
  destIndex?: string;
}): DataFrameAnalyticsConfig {
  const jobId = overrides?.jobId ?? 'test-job-1';
  return {
    id: jobId,
    source: { index: overrides?.sourceIndices ?? ['valid-index'] },
    dest: { index: overrides?.destIndex ?? 'dest-index' },
    analysis: { outlier_detection: {} },
  } as DataFrameAnalyticsConfig;
}

describe('JobImportService', () => {
  let jobImportService: JobImportService;
  let mockEsSearch: jest.MockedFunction<MlApi['esSearch']>;
  let mockValidateDatafeedPreview: jest.MockedFunction<MlApi['validateDatafeedPreview']>;
  let mockGetFilters: jest.Mock;

  beforeEach(() => {
    mockEsSearch = jest.fn();
    mockValidateDatafeedPreview = jest.fn();
    mockGetFilters = jest.fn().mockResolvedValue([]);
    jobImportService = new JobImportService(
      mockEsSearch,
      mockValidateDatafeedPreview,
      mockGetFilters
    );
  });

  describe('validateJobs', () => {
    describe('for data-frame-analytics jobs', () => {
      it('should validate jobs with valid source indices', async () => {
        const jobs: DataFrameAnalyticsConfig[] = [createBaseDfaJob()];

        mockEsSearch.mockResolvedValue({
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        });

        const result = await jobImportService.validateJobs(jobs, 'data-frame-analytics');

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
          createBaseDfaJob({ sourceIndices: ['missing-index'] }),
        ];

        mockEsSearch.mockRejectedValue(createIndexNotFoundError('missing-index'));

        const result = await jobImportService.validateJobs(jobs, 'data-frame-analytics');

        expect(result.jobs).toHaveLength(0);
        expect(result.skippedJobs).toHaveLength(1);
        expect(result.skippedJobs[0].jobId).toBe('test-job-1');
        expect(result.skippedJobs[0].sourceIndicesErrors).toBeDefined();
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].index).toBe('missing-index');
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].error).toContain('no such index');
      });

      it('should skip jobs when index pattern matches no indices', async () => {
        const jobs: DataFrameAnalyticsConfig[] = [
          createBaseDfaJob({ sourceIndices: ['pattern-*'] }),
        ];

        mockEsSearch.mockResolvedValue({
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        });

        const result = await jobImportService.validateJobs(jobs, 'data-frame-analytics');

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
        const jobs: DataFrameAnalyticsConfig[] = [createBaseDfaJob({ sourceIndices: [] })];

        const result = await jobImportService.validateJobs(jobs, 'data-frame-analytics');

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

      it('should handle multiple jobs with mixed validity', async () => {
        const jobs: DataFrameAnalyticsConfig[] = [
          createBaseDfaJob({ jobId: 'test-job-1', destIndex: 'dest-index-1' }),
          createBaseDfaJob({
            jobId: 'test-job-2',
            sourceIndices: ['invalid-index'],
            destIndex: 'dest-index-2',
          }),
        ];

        mockEsSearch
          .mockResolvedValueOnce({
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          })
          .mockRejectedValueOnce(createIndexNotFoundError('invalid-index'));

        const result = await jobImportService.validateJobs(jobs, 'data-frame-analytics');

        expect(result.jobs).toHaveLength(1);
        expect(result.jobs[0].jobId).toBe('test-job-1');
        expect(result.skippedJobs).toHaveLength(1);
        expect(result.skippedJobs[0].jobId).toBe('test-job-2');
        expect(result.skippedJobs[0].sourceIndicesErrors).toBeDefined();
        expect(result.skippedJobs[0].sourceIndicesErrors).toHaveLength(1);
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].index).toBe('invalid-index');
      });

      it('should handle job with multiple indices where some are invalid', async () => {
        const jobs: DataFrameAnalyticsConfig[] = [
          createBaseDfaJob({ sourceIndices: ['valid-index', 'missing-index'] }),
        ];

        mockEsSearch
          .mockResolvedValueOnce({
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          })
          .mockRejectedValueOnce(createIndexNotFoundError('missing-index'));

        const result = await jobImportService.validateJobs(jobs, 'data-frame-analytics');

        expect(result.jobs).toHaveLength(0);
        expect(result.skippedJobs).toHaveLength(1);
        expect(result.skippedJobs[0].sourceIndicesErrors).toHaveLength(1);
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].index).toBe('missing-index');
      });

      it('should skip jobs with multiple invalid source indices', async () => {
        const jobs: DataFrameAnalyticsConfig[] = [
          createBaseDfaJob({ sourceIndices: ['missing-index-1', 'missing-index-2'] }),
        ];

        mockEsSearch
          .mockRejectedValueOnce(createIndexNotFoundError('missing-index-1'))
          .mockResolvedValueOnce({
            _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          });

        const result = await jobImportService.validateJobs(jobs, 'data-frame-analytics');

        expect(result.jobs).toHaveLength(0);
        expect(result.skippedJobs).toHaveLength(1);
        expect(result.skippedJobs[0].jobId).toBe('test-job-1');
        expect(result.skippedJobs[0].sourceIndicesErrors).toBeDefined();
        expect(result.skippedJobs[0].sourceIndicesErrors).toHaveLength(2);
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].index).toBe('missing-index-1');
        expect(result.skippedJobs[0].sourceIndicesErrors?.[0].error).toContain('no such index');
        expect(result.skippedJobs[0].sourceIndicesErrors?.[1].index).toBe('missing-index-2');
        expect(result.skippedJobs[0].sourceIndicesErrors?.[1].error).toBe(
          'Index pattern matches no indices'
        );
      });
    });

    describe('for anomaly-detector jobs', () => {
      it('should validate AD jobs with valid indices', async () => {
        const jobs: ImportedAdJob[] = [createBaseAdJob({ jobId: 'ad-job-1' })];

        const result = await jobImportService.validateJobs(jobs, 'anomaly-detector');

        expect(result.jobs).toHaveLength(1);
        expect(result.jobs[0].jobId).toBe('ad-job-1');
        expect(result.skippedJobs).toHaveLength(0);
        expect(mockEsSearch).not.toHaveBeenCalled();
      });

      it('should not validate source indices for AD jobs', async () => {
        const jobs: ImportedAdJob[] = [
          createBaseAdJob({ jobId: 'ad-job-1', indices: ['some-index'] }),
        ];
        const result = await jobImportService.validateJobs(jobs, 'anomaly-detector');

        expect(result.jobs).toHaveLength(1);
        expect(result.jobs[0].jobId).toBe('ad-job-1');
        expect(mockEsSearch).not.toHaveBeenCalled();
      });

      it('should skip AD jobs with missing filters', async () => {
        const jobs: ImportedAdJob[] = [
          createBaseAdJob({
            jobId: 'ad-job-1',
            indices: ['some-index'],
            detectors: [
              {
                function: 'count',
                custom_rules: [
                  {
                    actions: ['skip_result'],
                    scope: {
                      field_name: {
                        filter_id: 'missing-filter-1',
                        filter_type: 'include',
                      },
                    },
                  },
                ],
              },
            ],
          }),
        ];

        mockGetFilters.mockResolvedValue([{ filter_id: 'existing-filter' }]);

        const result = await jobImportService.validateJobs(jobs, 'anomaly-detector');

        expect(result.jobs).toHaveLength(0);
        expect(result.skippedJobs).toHaveLength(1);
        expect(result.skippedJobs[0].jobId).toBe('ad-job-1');
        expect(result.skippedJobs[0].missingFilters).toBeDefined();
        expect(result.skippedJobs[0].missingFilters).toEqual(['missing-filter-1']);
        expect(mockEsSearch).not.toHaveBeenCalled();
      });

      it('should skip AD jobs with multiple missing filters', async () => {
        const jobs: ImportedAdJob[] = [
          createBaseAdJob({
            jobId: 'ad-job-1',
            indices: ['some-index'],
            detectors: [
              {
                function: 'count',
                custom_rules: [
                  {
                    actions: ['skip_result'],
                    scope: {
                      field_name: {
                        filter_id: 'missing-filter-1',
                        filter_type: 'include',
                      },
                    },
                  },
                ],
              },
              {
                function: 'mean',
                field_name: 'value',
                custom_rules: [
                  {
                    actions: ['skip_result'],
                    scope: {
                      field_name: {
                        filter_id: 'missing-filter-2',
                        filter_type: 'exclude',
                      },
                    },
                  },
                ],
              },
              {
                function: 'mean',
                field_name: 'value',
                custom_rules: [
                  {
                    actions: ['skip_result'],
                    scope: {
                      field_name: {
                        filter_id: 'existing-filter',
                        filter_type: 'exclude',
                      },
                    },
                  },
                ],
              },
            ],
          }),
        ];

        mockGetFilters.mockResolvedValue([{ filter_id: 'existing-filter' }]);

        const result = await jobImportService.validateJobs(jobs, 'anomaly-detector');

        expect(result.jobs).toHaveLength(0);
        expect(result.skippedJobs).toHaveLength(1);
        expect(result.skippedJobs[0].jobId).toBe('ad-job-1');
        expect(result.skippedJobs[0].missingFilters).toBeDefined();
        expect(result.skippedJobs[0].missingFilters).toEqual([
          'missing-filter-1',
          'missing-filter-2',
        ]);
        expect(mockEsSearch).not.toHaveBeenCalled();
      });

      it('should validate datafeeds and include warnings in results', async () => {
        const jobs: ImportedAdJob[] = [createBaseAdJob({ jobId: 'ad-job-1' })];

        mockValidateDatafeedPreview.mockResolvedValue({
          valid: true,
          documentsFound: true,
        });

        const result = await jobImportService.validateJobs(jobs, 'anomaly-detector');

        expect(result.jobs).toHaveLength(1);
        expect(result.jobs[0].jobId).toBe('ad-job-1');
        expect(result.datafeedValidations.size).toBe(1);
        expect(result.datafeedValidations.get('ad-job-1')?.hasWarning).toBe(false);
      });

      it('should include datafeed warnings for jobs with missing indices', async () => {
        const jobs: ImportedAdJob[] = [
          createBaseAdJob({
            jobId: 'ad-job-1',
            indices: ['logs-*', 'missing-index', 'metrics-*'],
          }),
        ];

        const errorMessage =
          'datafeed datafeed-1 cannot retrieve data because index missing-index does not exist';

        mockValidateDatafeedPreview.mockResolvedValue({
          valid: false,
          documentsFound: false,
          error: errorMessage,
        });

        const result = await jobImportService.validateJobs(jobs, 'anomaly-detector');

        expect(result.jobs).toHaveLength(1);
        expect(result.datafeedValidations.size).toBe(1);
        const validation = result.datafeedValidations.get('ad-job-1');
        expect(validation?.hasWarning).toBe(true);
        expect(validation?.warningMessage).toContain(errorMessage);
      });

      it('should include datafeed warning when preview returns error', async () => {
        const jobs: ImportedAdJob[] = [createBaseAdJob({ jobId: 'ad-job-1' })];

        const errorMessage = `datafeed ${jobs[0].datafeed.datafeed_id} cannot retrieve data because index ${jobs[0].datafeed.indices[0]} does not exist`;

        mockValidateDatafeedPreview.mockResolvedValue({
          valid: false,
          documentsFound: false,
          error: errorMessage,
        });

        const result = await jobImportService.validateJobs(jobs, 'anomaly-detector');

        expect(result.jobs).toHaveLength(1);
        const validation = result.datafeedValidations.get('ad-job-1');
        expect(validation?.hasWarning).toBe(true);
        expect(validation?.warningMessage).toContain(errorMessage);
      });

      it('should include datafeed warning when preview is invalid', async () => {
        const jobs: ImportedAdJob[] = [createBaseAdJob({ jobId: 'ad-job-1' })];

        mockValidateDatafeedPreview.mockResolvedValue({
          valid: false,
          documentsFound: true,
        });

        const result = await jobImportService.validateJobs(jobs, 'anomaly-detector');

        expect(result.jobs).toHaveLength(1);
        const validation = result.datafeedValidations.get('ad-job-1');
        expect(validation?.hasWarning).toBe(true);
        expect(validation?.warningMessage).toContain('Datafeed preview failed');
      });

      it('should include datafeed warning when no documents found', async () => {
        const jobs: ImportedAdJob[] = [createBaseAdJob({ jobId: 'ad-job-1' })];

        mockValidateDatafeedPreview.mockResolvedValue({
          valid: true,
          documentsFound: false,
        });

        const result = await jobImportService.validateJobs(jobs, 'anomaly-detector');

        expect(result.jobs).toHaveLength(1);
        const validation = result.datafeedValidations.get('ad-job-1');
        expect(validation?.hasWarning).toBe(true);
        expect(validation?.warningMessage).toContain('Datafeed preview returned no data');
      });

      it('should handle datafeed validation errors gracefully', async () => {
        const jobs: ImportedAdJob[] = [createBaseAdJob({ jobId: 'ad-job-1' })];

        mockValidateDatafeedPreview.mockRejectedValue(new Error('Network error'));

        const result = await jobImportService.validateJobs(jobs, 'anomaly-detector');

        expect(result.jobs).toHaveLength(1);
        const validation = result.datafeedValidations.get('ad-job-1');
        expect(validation?.hasWarning).toBe(true);
        expect(validation?.warningMessage).toContain('Unable to validate datafeed preview');
        expect(validation?.warningMessage).toContain('Network error');
      });

      it('should validate multiple AD jobs with mixed datafeed results', async () => {
        const jobs: ImportedAdJob[] = [
          createBaseAdJob({ jobId: 'ad-job-1' }),
          createBaseAdJob({ jobId: 'ad-job-2' }),
          createBaseAdJob({ jobId: 'ad-job-3' }),
        ];

        mockValidateDatafeedPreview
          .mockResolvedValueOnce({
            valid: true,
            documentsFound: true,
          })
          .mockResolvedValueOnce({
            valid: false,
            documentsFound: false,
            error: 'Validation failed',
          })
          .mockResolvedValueOnce({
            valid: true,
            documentsFound: false,
          });

        const result = await jobImportService.validateJobs(jobs, 'anomaly-detector');

        expect(result.jobs).toHaveLength(3);
        expect(result.datafeedValidations.size).toBe(3);
        expect(mockValidateDatafeedPreview).toHaveBeenCalledTimes(3);

        // First job: valid, no warnings
        const validation1 = result.datafeedValidations.get('ad-job-1');
        expect(validation1?.hasWarning).toBe(false);
        expect(validation1?.warningMessage).toBeUndefined();

        // Second job: validation error
        const validation2 = result.datafeedValidations.get('ad-job-2');
        expect(validation2?.hasWarning).toBe(true);
        expect(validation2?.warningMessage).toContain('Unable to validate datafeed preview');
        expect(validation2?.warningMessage).toContain('Validation failed');

        // Third job: no documents found
        const validation3 = result.datafeedValidations.get('ad-job-3');
        expect(validation3?.hasWarning).toBe(true);
        expect(validation3?.warningMessage).toContain('Datafeed preview returned no data');
      });
    });
  });
});
