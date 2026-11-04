/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import {
  MATERIALIZE_API_PATH,
  MATERIALIZE_API_VERSION,
  MATERIALIZE_FEATURE_FLAG,
} from '../../common';
import type { MaterializedNode } from '../materialize/nodes';
import { isomerPluginMock } from '../mocks';
import { registerMaterializeRoute } from './materialize_route';
import { materializeRequestBodySchema } from './schemas';

const node: MaterializedNode = { type: 'markdown', text: 'There are **3** open alerts.' };

const setup = () => {
  const router = httpServiceMock.createRouter();
  const addVersion = jest.fn();
  (router.versioned.post as jest.Mock).mockReturnValue({ addVersion });
  const client = isomerPluginMock.createScopedClient();
  client.materialize.mockResolvedValue(node);
  const createClient = jest.fn(() => client);
  registerMaterializeRoute({ router, createClient });
  const [[versionConfig, handler]] = addVersion.mock.calls as Array<[unknown, RequestHandler]>;
  return { router, versionConfig, handler, client, createClient };
};

const handlerContext = (enabled: boolean) => {
  const getBooleanValue = jest.fn(async () => enabled);
  const savedObjectsClient = savedObjectsClientMock.create();
  return {
    getBooleanValue,
    savedObjectsClient,
    context: {
      core: Promise.resolve({
        featureFlags: { getBooleanValue },
        savedObjects: { client: savedObjectsClient },
      }),
    } as unknown as Parameters<RequestHandler>[0],
  };
};

describe('registerMaterializeRoute', () => {
  it('registers a public versioned POST route', () => {
    const { router, versionConfig } = setup();
    expect(MATERIALIZE_API_PATH).toBe('/api/isomer/materialize');
    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: MATERIALIZE_API_PATH, access: 'public' })
    );
    expect(versionConfig).toEqual(expect.objectContaining({ version: MATERIALIZE_API_VERSION }));
  });

  it('returns 404 when materialization is off', async () => {
    const { handler, createClient } = setup();
    const { context, getBooleanValue } = handlerContext(false);
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      body: { input: { type: 'lens', id: 'abc' } },
    });

    await handler(context, request, response);

    expect(getBooleanValue).toHaveBeenCalledWith(MATERIALIZE_FEATURE_FLAG, false);
    expect(response.notFound).toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('materializes as the requesting user and returns a composition', async () => {
    const { handler, createClient, client } = setup();
    const { context, savedObjectsClient } = handlerContext(true);
    const response = httpServerMock.createResponseFactory();
    const filter = {
      meta: { key: 'host.name', negate: false },
      query: { match_phrase: { 'host.name': 'web-01' } },
    };
    const request = httpServerMock.createKibanaRequest({
      body: {
        input: { type: 'lens', id: 'abc' },
        context: {
          time_range: { from: 'now-15m', to: 'now' },
          filters: [filter],
          time_zone: 'Europe/Paris',
        },
      },
    });

    await handler(context, request, response);

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ request, savedObjectsClient })
    );
    expect(client.materialize).toHaveBeenCalledWith(
      { type: 'lens', id: 'abc' },
      { timeRange: { from: 'now-15m', to: 'now' }, filters: [filter], timeZone: 'Europe/Paris' }
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        type: 'view',
        body: [node],
        meta: { source: 'kibana', generatedAt: expect.any(String) },
      },
    });
  });
});

describe('materializeRequestBodySchema', () => {
  it('accepts by-reference and by-value input', () => {
    expect(
      materializeRequestBodySchema.safeParse({ input: { type: 'lens', id: 'abc' } }).success
    ).toBe(true);
    expect(
      materializeRequestBodySchema.safeParse({
        input: { type: 'lens', config: { type: 'metric' } },
        context: { query: { language: 'kuery', query: 'host.name: web-01' } },
      }).success
    ).toBe(true);
  });

  it('refuses input that is neither, or is unbounded', () => {
    const refused = [
      { input: { type: 'lens' } },
      { input: { type: '', id: 'abc' } },
      { input: { type: 'lens', id: 'x'.repeat(1025) } },
      { input: { type: 'lens', id: 'abc' }, context: { filters: Array(501).fill({ meta: {} }) } },
      { input: { type: 'lens', id: 'abc' }, context: { unknown: true } },
    ];
    for (const body of refused) {
      expect(materializeRequestBodySchema.safeParse(body).success).toBe(false);
    }
  });
});
