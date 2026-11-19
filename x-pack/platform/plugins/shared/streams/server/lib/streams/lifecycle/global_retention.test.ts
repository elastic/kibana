/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type DiagnosticResult } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getDataStreamGlobalRetention } from './global_retention';

const createResponseError = (statusCode: number): errors.ResponseError =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type: 'security_exception' } },
    headers: {},
    warnings: [],
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'test',
      request: {} as unknown as DiagnosticResult['meta']['request'],
    },
  });

const createEsClientMock = ({ request }: { request: jest.Mock }): ElasticsearchClient =>
  ({
    transport: { request },
  } as unknown as ElasticsearchClient);

describe('getDataStreamGlobalRetention', () => {
  it('reads both default and max from the data stream lifecycle', async () => {
    const request = jest.fn().mockResolvedValue({
      global_retention: { default_retention: '90d', max_retention: '365d' },
    });

    const result = await getDataStreamGlobalRetention({
      esClient: createEsClientMock({ request }),
      name: 'logs-test',
    });

    expect(result).toEqual({ default_retention: '90d', max_retention: '365d' });
  });

  it('returns only the max when the default is not configured', async () => {
    const request = jest.fn().mockResolvedValue({
      global_retention: { max_retention: '365d' },
    });

    const result = await getDataStreamGlobalRetention({
      esClient: createEsClientMock({ request }),
      name: 'logs-test',
    });

    expect(result).toEqual({ max_retention: '365d' });
  });

  it('returns an empty result when no global retention is configured', async () => {
    const request = jest.fn().mockResolvedValue({ global_retention: {} });

    const result = await getDataStreamGlobalRetention({
      esClient: createEsClientMock({ request }),
      name: 'logs-test',
    });

    expect(result).toEqual({});
  });

  it('degrades to an empty result when the user lacks privileges (403)', async () => {
    const request = jest.fn().mockRejectedValue(createResponseError(403));

    const result = await getDataStreamGlobalRetention({
      esClient: createEsClientMock({ request }),
      name: 'logs-test',
    });

    expect(result).toEqual({});
  });

  it('degrades to an empty result when the stream is missing (404)', async () => {
    const request = jest.fn().mockRejectedValue(createResponseError(404));

    const result = await getDataStreamGlobalRetention({
      esClient: createEsClientMock({ request }),
      name: 'logs-test',
    });

    expect(result).toEqual({});
  });

  it('rethrows unexpected errors', async () => {
    const request = jest.fn().mockRejectedValue(createResponseError(500));

    await expect(
      getDataStreamGlobalRetention({
        esClient: createEsClientMock({ request }),
        name: 'logs-test',
      })
    ).rejects.toThrow();
  });
});
