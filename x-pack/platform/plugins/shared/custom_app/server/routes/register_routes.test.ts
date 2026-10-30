/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { IRouter } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CUSTOM_APP_STATE_VERSION } from '@kbn/custom-app-common';
import { registerSavedAppRoutes } from './register_routes';

type Handler = (
  context: unknown,
  request: unknown,
  response: unknown
) => Promise<{ status: number; payload?: unknown }>;

interface Registered {
  method: string;
  config: {
    path: string;
    access: string;
    security: { authz: { enabled: boolean; reason: string } };
  };
  version: { version: string; validate: { request: Record<string, unknown> } };
  handler: Handler;
}

/** A router that remembers what was registered on it, so the routes can be called directly. */
const recordRouter = () => {
  const registered: Registered[] = [];
  const versionedFor = (method: string) => (config: Registered['config']) => ({
    addVersion: (version: Registered['version'], handler: Handler) => {
      registered.push({ method, config, version, handler });
    },
  });
  const router = {
    versioned: {
      get: versionedFor('get'),
      post: versionedFor('post'),
      put: versionedFor('put'),
      delete: versionedFor('delete'),
    },
  } as unknown as IRouter;
  return { router, registered };
};

const find = (registered: Registered[], method: string, path: string) => {
  const route = registered.find((entry) => entry.method === method && entry.config.path === path);
  if (!route) throw new Error(`No ${method} ${path} route`);
  return route;
};

const document = { state: {}, root: { type: 'heading', id: 'title', text: 'Hi' } };
const stored = { title: 'Explorer', version: CUSTOM_APP_STATE_VERSION, document };
const savedObject = { id: 'app-1', type: 'custom_app', attributes: stored, references: [] };

describe('the saved app routes', () => {
  const client = savedObjectsClientMock.create();
  const context = { core: Promise.resolve({ savedObjects: { client } }) };
  const { router, registered } = recordRouter();
  registerSavedAppRoutes(router);

  const call = (method: string, path: string, request: object = {}) =>
    find(registered, method, path).handler(context, request, kibanaResponseFactory);

  beforeEach(() => jest.resetAllMocks());

  it('has a route for each thing an app can have done to it', () => {
    expect(registered.map(({ method, config }) => `${method} ${config.path}`).sort()).toEqual([
      'delete /internal/custom_app/apps/{id}',
      'get /internal/custom_app/apps',
      'get /internal/custom_app/apps/{id}',
      'post /internal/custom_app/apps',
      'put /internal/custom_app/apps/{id}',
    ]);
  });

  it('keeps every route internal, versioned, and says why it leaves authorization to the client', () => {
    registered.forEach(({ config, version }) => {
      expect(config.access).toBe('internal');
      expect(version.version).toBe('1');
      expect(config.security.authz.enabled).toBe(false);
      expect(config.security.authz.reason).toContain('saved objects client');
    });
  });

  it('checks what comes in: the body of a write, and the id of the others', () => {
    expect(
      Object.keys(find(registered, 'post', '/internal/custom_app/apps').version.validate.request)
    ).toEqual(['body']);
    expect(
      Object.keys(
        find(registered, 'put', '/internal/custom_app/apps/{id}').version.validate.request
      ).sort()
    ).toEqual(['body', 'params']);
    expect(
      Object.keys(
        find(registered, 'get', '/internal/custom_app/apps/{id}').version.validate.request
      )
    ).toEqual(['params']);
    expect(
      Object.keys(find(registered, 'get', '/internal/custom_app/apps').version.validate.request)
    ).toEqual(['query']);
  });

  it('creates, reads, updates and deletes through the client of the request', async () => {
    client.create.mockResolvedValue(savedObject);
    client.get.mockResolvedValue(savedObject);
    client.update.mockResolvedValue({} as never);
    client.delete.mockResolvedValue({});

    const input = { title: 'Explorer', document };
    expect((await call('post', '/internal/custom_app/apps', { body: input })).status).toBe(200);
    expect(
      (await call('get', '/internal/custom_app/apps/{id}', { params: { id: 'app-1' } })).status
    ).toBe(200);
    expect(
      (
        await call('put', '/internal/custom_app/apps/{id}', {
          params: { id: 'app-1' },
          body: input,
        })
      ).status
    ).toBe(200);
    expect(
      (await call('delete', '/internal/custom_app/apps/{id}', { params: { id: 'app-1' } })).status
    ).toBe(200);
    expect(client.create).toHaveBeenCalledTimes(1);
    expect(client.delete).toHaveBeenCalledWith('custom_app', 'app-1');
  });

  describe('when the client says no', () => {
    it.each([
      [
        'an app that is not there',
        SavedObjectsErrorHelpers.createGenericNotFoundError('custom_app', 'x'),
        404,
      ],
      [
        'a user without the privilege',
        SavedObjectsErrorHelpers.decorateForbiddenError(new Error('no')),
        403,
      ],
      ['a conflicting write', SavedObjectsErrorHelpers.createConflictError('custom_app', 'x'), 409],
      ['a request the store refuses', SavedObjectsErrorHelpers.createBadRequestError('bad'), 400],
    ])('answers %s with %i', async (_name, error, status) => {
      client.get.mockRejectedValue(error);

      expect(
        (await call('get', '/internal/custom_app/apps/{id}', { params: { id: 'x' } })).status
      ).toBe(status);
    });

    it('lets an error nobody expected surface, instead of passing it off as a client mistake', async () => {
      client.get.mockRejectedValue(new Error('boom'));

      await expect(
        call('get', '/internal/custom_app/apps/{id}', { params: { id: 'x' } })
      ).rejects.toThrow('boom');
    });
  });
});
