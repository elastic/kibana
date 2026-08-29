/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Streams } from '@kbn/streams-schema';
import { describeDataset, formatDocumentAnalysis, getMappingConflicts } from '@kbn/ai-tools';
import { datasetAnalysisGenerator } from './dataset_analysis';

jest.mock('@kbn/ai-tools', () => ({
  describeDataset: jest.fn(),
  formatDocumentAnalysis: jest.fn(),
  getMappingConflicts: jest.fn(),
}));

const describeDatasetMock = jest.mocked(describeDataset);
const formatDocumentAnalysisMock = jest.mocked(formatDocumentAnalysis);
const getMappingConflictsMock = jest.mocked(getMappingConflicts);

const stream = { name: 'logs.test-default' } as Streams.all.Definition;
const esClient = {} as ElasticsearchClient;
const logger = {} as Logger;
const signal = new AbortController().signal;

const formatted = { total: 1, sampled: 1, fields: {} };

describe('datasetAnalysisGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    describeDatasetMock.mockResolvedValue({} as never);
    formatDocumentAnalysisMock.mockReturnValue(formatted as never);
  });

  it('passes source-wide conflicts (probed without time bounds) to the formatter keyed by field', async () => {
    getMappingConflictsMock.mockResolvedValueOnce([
      { field: 'exception.message', types: ['keyword', 'text'], suggestedCast: 'keyword' },
      { field: 'host.name', types: ['ip', 'keyword'] },
    ]);

    const result = await datasetAnalysisGenerator.generate({
      stream,
      start: 100,
      end: 200,
      esClient,
      logger,
      signal,
    });

    expect(result).toEqual({ analysis: formatted });
    expect(formatDocumentAnalysisMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        conflicts: {
          'exception.message': { types: ['keyword', 'text'], suggestedCast: 'keyword' },
          'host.name': { types: ['ip', 'keyword'] },
        },
      })
    );

    const conflictCall = getMappingConflictsMock.mock.calls[0][0];
    expect(conflictCall).not.toHaveProperty('start');
    expect(conflictCall).not.toHaveProperty('end');
  });
});
