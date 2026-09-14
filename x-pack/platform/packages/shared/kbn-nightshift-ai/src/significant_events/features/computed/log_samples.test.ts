/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getSampleDocumentsEsql } from '@kbn/ai-tools';
import type { AnalysisTarget } from '../../../shared/analysis_target';
import { logSamplesGenerator } from './log_samples';

jest.mock('@kbn/ai-tools', () => ({
  getSampleDocumentsEsql: jest.fn(),
}));

const getSampleDocumentsEsqlMock = jest.mocked(getSampleDocumentsEsql);

const target: AnalysisTarget = {
  id: 'logs.test-default',
  name: 'logs.test-default',
  sources: ['logs.test-default', 'logs.test-default.*'],
  samplingSource: 'logs.test-default',
};
const esClient = {} as ElasticsearchClient;
const logger = {} as Logger;
const signal = new AbortController().signal;

describe('logSamplesGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses ES|QL sampling and formats returned _source documents', async () => {
    getSampleDocumentsEsqlMock.mockResolvedValueOnce({
      hits: [
        {
          _index: '',
          _id: 'doc-1',
          _source: {
            service: { name: 'checkout' },
            message: 'checkout succeeded',
          },
        },
      ],
      total: 1,
    });

    const result = await logSamplesGenerator.generate({
      target,
      start: 100,
      end: 200,
      esClient,
      logger,
      signal,
    });

    expect(getSampleDocumentsEsqlMock).toHaveBeenCalledWith({
      esClient,
      index: target.samplingSource,
      start: 100,
      end: 200,
      sampleSize: 5,
      abortSignal: signal,
    });
    expect(result).toEqual({
      samples: [{ 'service.name': 'checkout', message: 'checkout succeeded' }],
    });
  });
});
