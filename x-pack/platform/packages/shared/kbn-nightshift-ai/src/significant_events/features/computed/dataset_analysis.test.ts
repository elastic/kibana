/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { describeDataset, getMappingConflicts } from '@kbn/ai-tools';
import type { AnalysisTarget } from '../../../shared/analysis_target';
import { datasetAnalysisGenerator } from './dataset_analysis';
import { formatDatasetAnalysis } from './format_dataset_analysis';

jest.mock('@kbn/ai-tools', () => ({
  describeDataset: jest.fn(),
  getMappingConflicts: jest.fn(),
}));
jest.mock('./format_dataset_analysis', () => ({ formatDatasetAnalysis: jest.fn() }));

const describeDatasetMock = jest.mocked(describeDataset);
const formatDatasetAnalysisMock = jest.mocked(formatDatasetAnalysis);
const getMappingConflictsMock = jest.mocked(getMappingConflicts);

const target: AnalysisTarget = {
  id: 'logs.test-default',
  name: 'logs.test-default',
  sources: ['logs.test-default', 'logs.test-default.*'],
  samplingSource: 'logs.test-default',
};
const esClient = {} as ElasticsearchClient;
const logger = { debug: jest.fn() } as unknown as Logger;
const signal = new AbortController().signal;

const formatted = { total: 1, sampled: 1, fields: {} };

describe('datasetAnalysisGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    describeDatasetMock.mockResolvedValue({} as never);
    formatDatasetAnalysisMock.mockReturnValue(formatted as never);
  });

  it('passes conflicts from the full stream hierarchy to the formatter keyed by field', async () => {
    getMappingConflictsMock.mockResolvedValueOnce([
      { field: 'exception.message', types: ['keyword', 'text'], suggestedCast: 'keyword' },
      { field: 'host.name', types: ['ip', 'keyword'] },
    ]);

    const result = await datasetAnalysisGenerator.generate({
      target,
      start: 100,
      end: 200,
      esClient,
      logger,
      signal,
    });

    expect(result).toEqual({ analysis: formatted });
    expect(formatDatasetAnalysisMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        conflicts: {
          'exception.message': { types: ['keyword', 'text'], suggestedCast: 'keyword' },
          'host.name': { types: ['ip', 'keyword'] },
        },
      })
    );

    expect(describeDatasetMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ index: 'logs.test-default', sampleSize: 1000 })
    );

    const conflictCall = getMappingConflictsMock.mock.calls[0][0];
    expect(conflictCall.index).toEqual(['logs.test-default', 'logs.test-default.*']);
    expect(conflictCall).not.toHaveProperty('start');
    expect(conflictCall).not.toHaveProperty('end');
  });

  it('still returns the analysis with no conflicts when the probe fails', async () => {
    getMappingConflictsMock.mockRejectedValueOnce(new Error('probe boom'));

    const result = await datasetAnalysisGenerator.generate({
      target,
      start: 100,
      end: 200,
      esClient,
      logger,
      signal,
    });

    expect(result).toEqual({ analysis: formatted });
    expect(formatDatasetAnalysisMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ conflicts: {} })
    );
  });
});
