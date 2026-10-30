/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AclChangeError } from '@kbn/access-control';
import { kibanaResponseFactory, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import { defineChangeAccessRoutes } from './change_access';
import { accessControlRoutesMock } from './index.mock';

const WARNINGS = [
  {
    principal: { type: 'user' as const, id: 'u_grantee' },
    level: 'use' as const,
    reason: 'missing_feature_privileges' as const,
  },
];

describe('Change access routes', () => {
  let mocks: ReturnType<typeof accessControlRoutesMock.create>;
  beforeEach(() => {
    mocks = accessControlRoutesMock.create();
    mocks.savedObjectsClient.changeAcl.mockResolvedValue({
      version: 'WzIsMV0=',
      warnings: WARNINGS,
    } as Awaited<ReturnType<typeof mocks.savedObjectsClient.changeAcl>>);
    defineChangeAccessRoutes(mocks.routeParams);
  });

  const callRoute = (method: 'put' | 'post', path: string, body: Record<string, unknown>) =>
    accessControlRoutesMock.getHandler(mocks.routeParams.router, method, path)(
      mocks.context,
      httpServerMock.createKibanaRequest({ params: { type: 'action', id: '1' }, body }),
      kibanaResponseFactory
    );

  const replaceAccess = () =>
    callRoute('put', '/internal/security/access_control/{type}/{id}', {
      version: 'WzEsMV0=',
      general_access: 'none',
      entries: [{ type: 'user', id: 'u_grantee', access: 'use' }],
    });

  it('replaces access with the version the change was prepared against', async () => {
    const response = await replaceAccess();

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ version: 'WzIsMV0=', warnings: WARNINGS });
    expect(mocks.getSavedObjectsClient).toHaveBeenCalledWith({ includedHiddenTypes: ['action'] });
    expect(mocks.savedObjectsClient.changeAcl).toHaveBeenCalledWith(
      'action',
      '1',
      {
        kind: 'replace',
        general_access: 'none',
        entries: [{ type: 'user', id: 'u_grantee', access: 'use' }],
      },
      { version: 'WzEsMV0=' }
    );
  });

  it('claims an object', async () => {
    const response = await callRoute(
      'post',
      '/internal/security/access_control/{type}/{id}/_claim',
      { version: 'WzEsMV0=', general_access: 'use' }
    );

    expect(response.status).toBe(200);
    expect(mocks.savedObjectsClient.changeAcl).toHaveBeenCalledWith(
      'action',
      '1',
      { kind: 'claim', general_access: 'use' },
      { version: 'WzEsMV0=' }
    );
  });

  it('transfers ownership', async () => {
    const owner = { type: 'service_account', id: 'elastic/fleet-server' };

    const response = await callRoute(
      'post',
      '/internal/security/access_control/{type}/{id}/_transfer',
      { version: 'WzEsMV0=', owner }
    );

    expect(response.status).toBe(200);
    expect(mocks.savedObjectsClient.changeAcl).toHaveBeenCalledWith(
      'action',
      '1',
      { kind: 'transfer', owner },
      { version: 'WzEsMV0=' }
    );
  });

  it.each([
    ['bad_request', 400],
    ['forbidden', 403],
    ['conflict', 409],
  ] as const)('maps a %s access change error to %s', async (code, statusCode) => {
    mocks.savedObjectsClient.changeAcl.mockRejectedValue(new AclChangeError(code, 'Nope.'));

    const response = await replaceAccess();

    expect(response.status).toBe(statusCode);
    expect(response.payload).toEqual({ message: 'Nope.' });
  });

  it.each([
    ['bad request', SavedObjectsErrorHelpers.createBadRequestError('Nope.'), 400],
    ['forbidden', SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Nope.')), 403],
    ['not found', SavedObjectsErrorHelpers.createGenericNotFoundError('action', '1'), 404],
    ['conflict', SavedObjectsErrorHelpers.createConflictError('action', '1'), 409],
  ])('maps a %s Saved Objects error', async (_, error, statusCode) => {
    mocks.savedObjectsClient.changeAcl.mockRejectedValue(error);

    const response = await replaceAccess();

    expect(response.status).toBe(statusCode);
  });

  describe('request validation', () => {
    const getBodySchema = (method: 'put' | 'post', path: string) => {
      const [config] = mocks.routeParams.router[method].mock.calls.find(
        ([routeConfig]) => routeConfig.path === path
      )!;
      return (config.validate as { body: { validate: (value: unknown) => unknown } }).body;
    };

    it('requires the object version', () => {
      expect(() =>
        getBodySchema('put', '/internal/security/access_control/{type}/{id}').validate({
          general_access: 'none',
          entries: [],
        })
      ).toThrow('[version]');
      expect(() =>
        getBodySchema('post', '/internal/security/access_control/{type}/{id}/_claim').validate({})
      ).toThrow('[version]');
      expect(() =>
        getBodySchema('post', '/internal/security/access_control/{type}/{id}/_transfer').validate({
          owner: { type: 'user', id: 'u_1' },
        })
      ).toThrow('[version]');
    });

    it('rejects an unknown principal type', () => {
      expect(() =>
        getBodySchema('post', '/internal/security/access_control/{type}/{id}/_transfer').validate({
          version: '1',
          owner: { type: 'group', id: 'admins' },
        })
      ).toThrow('[owner.type]');
    });
  });
});
