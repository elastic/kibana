/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerResolveIndicesRoute } from './resolve_indices_route';
import type { AutomaticImportV2PluginRequestHandlerContext } from '../types';

const resolvePath = '/internal/automatic_import_v2/indices/resolve';

describe('resolve_indices_route', () => {
  let routeHandler: (
    context: AutomaticImportV2PluginRequestHandlerContext,
    request: { query: { name?: string } },
    response: { ok: jest.Mock; notFound: jest.Mock }
  ) => Promise<unknown>;
  let mockResolveIndex: jest.Mock;
  let mockResponse: { ok: jest.Mock; notFound: jest.Mock };

  const createMockContext = (): AutomaticImportV2PluginRequestHandlerContext =>
    ({
      automaticImportv2: Promise.resolve({
        esClient: {
          indices: {
            resolveIndex: mockResolveIndex,
          },
        },
      }),
    } as unknown as AutomaticImportV2PluginRequestHandlerContext);

  beforeEach(() => {
    mockResolveIndex = jest.fn();
    mockResponse = {
      ok: jest.fn().mockReturnValue({}),
      notFound: jest.fn().mockReturnValue({}),
    };

    const routeHandlers: Record<string, { handler: typeof routeHandler }> = {};
    const mockRouter = {
      versioned: {
        get: jest.fn().mockImplementation((config: { path: string }) => ({
          addVersion: jest
            .fn()
            .mockImplementation((_versionConfig: unknown, handler: typeof routeHandler) => {
              routeHandlers[`GET:${config.path}`] = { handler };
              return { addVersion: jest.fn() };
            }),
        })),
      },
    };

    registerResolveIndicesRoute(mockRouter as any, loggingSystemMock.create().get());
    routeHandler = routeHandlers[`GET:${resolvePath}`]?.handler;
    expect(routeHandler).toBeDefined();
  });

  it('calls esClient.indices.resolveIndex with name and expand_wildcards: open', async () => {
    const body = {
      indices: [{ name: 'idx-1' }],
      data_streams: [{ name: 'ds-1' }],
      aliases: [],
    };
    mockResolveIndex.mockResolvedValue(body);

    await routeHandler!(createMockContext(), { query: { name: 'logs*' } }, mockResponse);

    expect(mockResolveIndex).toHaveBeenCalledTimes(1);
    expect(mockResolveIndex).toHaveBeenCalledWith({
      name: 'logs*',
      expand_wildcards: 'open',
    });
    expect(mockResponse.ok).toHaveBeenCalledWith({ body });
    expect(mockResponse.notFound).not.toHaveBeenCalled();
  });

  it('defaults name to * when query.name is missing', async () => {
    mockResolveIndex.mockResolvedValue({ indices: [], data_streams: [], aliases: [] });

    await routeHandler!(createMockContext(), { query: {} }, mockResponse);

    expect(mockResolveIndex).toHaveBeenCalledWith({
      name: '*',
      expand_wildcards: 'open',
    });
  });

  it('returns notFound on 403 or 404 from Elasticsearch', async () => {
    mockResolveIndex.mockRejectedValue({ meta: { statusCode: 404 } });

    await routeHandler!(createMockContext(), { query: { name: 'missing*' } }, mockResponse);

    expect(mockResponse.notFound).toHaveBeenCalled();
    expect(mockResponse.ok).not.toHaveBeenCalled();
  });
});
