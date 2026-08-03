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
  DEFAULT_ESQL_QUERY_TIMEOUT_MS: 30_000,
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

  it('keeps only message + minimal context fields, dropping raw-document metadata', async () => {
    getSampleDocumentsEsqlMock.mockResolvedValueOnce({
      hits: [
        {
          _index: '',
          _id: 'doc-1',
          _source: {
            '@timestamp': '2026-07-29T10:00:00.000Z',
            log: { level: 'error' },
            message: 'connection refused',
            error: { type: 'ConnectionError', message: 'refused' },
            event: { outcome: 'failure' },
            service: { name: 'checkout-api' },
            kubernetes: { pod: { name: 'checkout-api-abc123' }, namespace: 'prod' },
            cloud: { instance: { id: 'i-0abc' }, region: 'us-east-1' },
            host: { mac: ['06-7B-87-2D-16-C3'] },
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

    expect(result).toEqual({
      samples: [
        {
          '@timestamp': '2026-07-29T10:00:00.000Z',
          'log.level': 'error',
          message: 'connection refused',
          'error.type': 'ConnectionError',
          'error.message': 'refused',
          'event.outcome': 'failure',
          'service.name': 'checkout-api',
        },
      ],
    });
  });

  it('keeps OTel-shaped signal fields (body.text, severity_text, resource.attributes.service.name)', async () => {
    getSampleDocumentsEsqlMock.mockResolvedValueOnce({
      hits: [
        {
          _index: '',
          _id: 'doc-1',
          _source: {
            '@timestamp': '2026-07-29T10:00:00.000Z',
            body: { text: 'connection refused' },
            severity_text: 'ERROR',
            severity_number: 17,
            attributes: {
              exception: { type: 'ConnectionError', message: 'refused' },
              event: { outcome: 'failure' },
              kubernetes: { pod: { name: 'checkout-api-abc123' } },
            },
            resource: {
              attributes: {
                'service.name': 'checkout-api',
                cloud: { region: 'us-east-1', 'service.name': 'EC2' },
                host: { name: 'ip-10-0-0-1' },
              },
            },
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

    expect(result).toEqual({
      samples: [
        {
          '@timestamp': '2026-07-29T10:00:00.000Z',
          'body.text': 'connection refused',
          severity_text: 'ERROR',
          severity_number: 17,
          'attributes.exception.type': 'ConnectionError',
          'attributes.exception.message': 'refused',
          'attributes.event.outcome': 'failure',
          'resource.attributes.service.name': 'checkout-api',
        },
      ],
    });
  });
});
