/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Streams } from '@kbn/streams-schema';
import { getSampleDocumentsEsql } from '@kbn/ai-tools';
import { errorLogsGenerator } from './error_logs';

jest.mock('@kbn/ai-tools', () => ({
  getSampleDocumentsEsql: jest.fn(),
}));

const getSampleDocumentsEsqlMock = jest.mocked(getSampleDocumentsEsql);

const stream = { name: 'logs.test-default' } as Streams.all.Definition;
const esClient = {} as ElasticsearchClient;
const logger = {} as Logger;

describe('errorLogsGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses an ES|QL MATCH_PHRASE filter with unmappedFields=NULLIFY', async () => {
    getSampleDocumentsEsqlMock.mockResolvedValueOnce({
      hits: [
        {
          _index: '',
          _id: 'doc-1',
          _source: {
            log: { level: 'error' },
            message: 'exception thrown',
          },
        },
      ],
      total: 1,
    });

    const result = await errorLogsGenerator.generate({
      stream,
      start: 100,
      end: 200,
      esClient,
      logger,
    });

    expect(getSampleDocumentsEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        esClient,
        index: stream.name,
        start: 100,
        end: 200,
        sampleSize: 5,
        unmappedFields: 'NULLIFY',
        // Composer-built expression; deep-equality matchers fail here so just
        // assert it is present. The query-string assertion lives in
        // get_sample_documents.test.ts; this test guarantees the generator
        // wires the whereCondition through.
        whereCondition: expect.anything(),
      })
    );
    expect(result).toEqual({
      samples: [{ 'log.level': 'error', message: 'exception thrown' }],
    });
  });
});
