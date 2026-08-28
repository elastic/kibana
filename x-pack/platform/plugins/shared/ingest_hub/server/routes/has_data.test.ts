/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { registerHasDataRoute } from './has_data';

function makeRouter() {
  return httpServiceMock.createRouter();
}

function makeRequest(query: Record<string, string>) {
  return httpServerMock.createKibanaRequest({ query });
}

describe('registerHasDataRoute', () => {
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } as any;

  it('rejects an invalid index pattern', async () => {
    const router = makeRouter();
    registerHasDataRoute({ router, logger });
    const [config] = router.get.mock.calls[0];
    const querySchema = (config.validate as any).query;

    expect(() =>
      querySchema.validate({ dataStreams: 'bad-pattern', start: '2025-01-01T00:00:00Z' })
    ).toThrow('Invalid index pattern');
  });

  it('rejects a pattern with arbitrary index name (security boundary)', async () => {
    const router = makeRouter();
    registerHasDataRoute({ router, logger });
    const [config] = router.get.mock.calls[0];
    const querySchema = (config.validate as any).query;

    expect(() =>
      querySchema.validate({
        dataStreams: '.security-7',
        start: '2025-01-01T00:00:00Z',
      })
    ).toThrow('Invalid index pattern');
  });

  it('accepts valid logs-* and metrics-* patterns', async () => {
    const router = makeRouter();
    registerHasDataRoute({ router, logger });
    const [config] = router.get.mock.calls[0];
    const querySchema = (config.validate as any).query;

    expect(() =>
      querySchema.validate({
        dataStreams: 'logs-aws.vpcflow-*,metrics-aws.ec2-*',
        start: '2025-01-01T00:00:00Z',
      })
    ).not.toThrow();
  });

  it('returns results with true for patterns with hits and false for empty', async () => {
    const router = makeRouter();
    registerHasDataRoute({ router, logger });

    const [, handler] = router.get.mock.calls[0];

    const msearchMock = jest.fn().mockResolvedValue({
      responses: [{ hits: { total: { value: 5 } } }, { hits: { total: { value: 0 } } }],
    });

    const mockContext = {
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: { msearch: msearchMock },
          },
        },
      }),
    };

    const request = makeRequest({
      dataStreams: 'logs-aws.vpcflow-*,metrics-aws.ec2-*',
      start: '2025-01-01T00:00:00Z',
    });
    const response = httpServerMock.createResponseFactory();

    await handler(mockContext as any, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        results: {
          'logs-aws.vpcflow-*': true,
          'metrics-aws.ec2-*': false,
        },
      },
    });
  });

  it('returns false for all patterns when no-shard error is thrown', async () => {
    const { errors } = await import('@elastic/elasticsearch');
    const router = makeRouter();
    registerHasDataRoute({ router, logger });
    const [, handler] = router.get.mock.calls[0];

    const noShardError = new errors.ResponseError({
      statusCode: 503,
      body: {
        error: {
          type: 'search_phase_execution_exception',
          root_cause: [{ type: 'no_shard_available_action_exception' }],
        },
      },
      headers: {},
      meta: {} as any,
      warnings: null,
    });

    const mockContext = {
      core: Promise.resolve({
        elasticsearch: {
          client: { asCurrentUser: { msearch: jest.fn().mockRejectedValue(noShardError) } },
        },
      }),
    };

    const request = makeRequest({
      dataStreams: 'logs-aws.vpcflow-*',
      start: '2025-01-01T00:00:00Z',
    });
    const response = httpServerMock.createResponseFactory();

    await handler(mockContext as any, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { results: { 'logs-aws.vpcflow-*': false } },
    });
  });

  it('builds the correct msearch body — one header+body pair per pattern', async () => {
    const router = makeRouter();
    registerHasDataRoute({ router, logger });
    const [, handler] = router.get.mock.calls[0];

    const msearchMock = jest.fn().mockResolvedValue({
      responses: [{ hits: { total: { value: 0 } } }],
    });

    const mockContext = {
      core: Promise.resolve({
        elasticsearch: {
          client: { asCurrentUser: { msearch: msearchMock } },
        },
      }),
    };

    const request = makeRequest({
      dataStreams: 'logs-aws.vpcflow-*',
      start: '2025-01-01T00:00:00Z',
    });
    const response = httpServerMock.createResponseFactory();

    await handler(mockContext as any, request, response);

    const { searches } = msearchMock.mock.calls[0][0];
    expect(searches).toHaveLength(2); // 1 pattern × 2 items (header + body)
    expect(searches[0]).toMatchObject({ index: 'logs-aws.vpcflow-*', ignore_unavailable: true });
    expect(searches[1]).toMatchObject({ size: 0, terminate_after: 1 });
  });
});
