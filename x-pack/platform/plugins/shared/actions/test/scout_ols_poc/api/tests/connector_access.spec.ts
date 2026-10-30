/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  createOlsTestContext,
  type OlsApi,
  type OlsTestContext,
  type Persona,
} from '../fixtures/personas';

const UPDATE_BODY = { name: 'renamed', config: {}, secrets: {} };
const EXECUTE_BODY = { params: { message: 'object-level security test' } };

apiTest.describe('Connector object-level access', { tag: '@local-stateful-classic' }, () => {
  let ctx: OlsTestContext;
  let publicId: string;
  let runOnlyId: string;
  let privateId: string;

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient }) => {
    ctx = await createOlsTestContext({ apiClient, esClient, kbnClient });
    const api = ctx.api(apiClient);
    publicId = await api.createConnector('owner');
    runOnlyId = await api.createConnector('owner', { general_access: 'use' });
    privateId = await api.createConnector('owner', {
      general_access: 'none',
      entries: [{ ...ctx.principal('grantee'), access: 'use' }],
    });
  });

  apiTest.afterAll(async () => {
    await ctx.cleanup();
  });

  const expectStatus = async (
    api: OlsApi,
    persona: Persona,
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    statusCode: number,
    body?: unknown
  ) => {
    const response = await api.request(persona, method, path, body);
    expect(
      response,
      `${persona} ${method} ${path}: ${JSON.stringify(response.body)}`
    ).toHaveStatusCode(statusCode);
    return response;
  };

  const listedIds = async (api: OlsApi, persona: Persona) => {
    const { body } = await expectStatus(api, persona, 'get', 'api/actions/connectors', 200);
    return (body as Array<{ id: string }>).map(({ id }) => id);
  };

  apiTest('lists only the connectors each person can view', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    for (const persona of ['owner', 'grantee', 'admin'] as const) {
      const ids = await listedIds(api, persona);
      for (const id of [publicId, runOnlyId, privateId]) {
        expect(ids).toContain(id);
      }
    }

    const strangerIds = await listedIds(api, 'stranger');
    expect(strangerIds).toContain(publicId);
    expect(strangerIds).toContain(runOnlyId);
    expect(strangerIds).not.toContain(privateId);
  });

  apiTest(
    'keeps public connectors as they were before object-level security',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      for (const persona of ['owner', 'grantee', 'stranger'] as const) {
        await expectStatus(api, persona, 'get', `api/actions/connector/${publicId}`, 200);
        await expectStatus(
          api,
          persona,
          'post',
          `api/actions/connector/${publicId}/_execute`,
          200,
          EXECUTE_BODY
        );
        await expectStatus(
          api,
          persona,
          'put',
          `api/actions/connector/${publicId}`,
          200,
          UPDATE_BODY
        );
      }
      // Feature privileges still apply on their own.
      await expectStatus(
        api,
        'reader',
        'put',
        `api/actions/connector/${publicId}`,
        403,
        UPDATE_BODY
      );
    }
  );

  apiTest(
    'lets everyone run a run-only connector, and only the owner edit it',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      for (const persona of ['grantee', 'stranger'] as const) {
        await expectStatus(api, persona, 'get', `api/actions/connector/${runOnlyId}`, 200);
        await expectStatus(
          api,
          persona,
          'post',
          `api/actions/connector/${runOnlyId}/_execute`,
          200,
          EXECUTE_BODY
        );
        const { body } = await expectStatus(
          api,
          persona,
          'put',
          `api/actions/connector/${runOnlyId}`,
          403,
          UPDATE_BODY
        );
        expect(body.message).toContain('missing "edit" permission');
      }
      await expectStatus(
        api,
        'owner',
        'put',
        `api/actions/connector/${runOnlyId}`,
        200,
        UPDATE_BODY
      );
    }
  );

  apiTest('hides a private connector from people without a grant', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    await expectStatus(api, 'owner', 'get', `api/actions/connector/${privateId}`, 200);

    // A stranger cannot tell a private connector from a missing one, for reads and writes alike.
    for (const [method, path, body] of [
      ['get', `api/actions/connector/${privateId}`, undefined],
      ['post', `api/actions/connector/${privateId}/_execute`, EXECUTE_BODY],
      ['put', `api/actions/connector/${privateId}`, UPDATE_BODY],
      ['delete', `api/actions/connector/${privateId}`, undefined],
    ] as const) {
      await expectStatus(api, 'stranger', method, path, 404, body);
    }
  });

  apiTest(
    'lets a use grantee run, but not edit or delete, a private connector',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      await expectStatus(api, 'grantee', 'get', `api/actions/connector/${privateId}`, 200);
      const { body } = await expectStatus(
        api,
        'grantee',
        'post',
        `api/actions/connector/${privateId}/_execute`,
        200,
        EXECUTE_BODY
      );
      expect(body.status).toBe('ok');
      await expectStatus(
        api,
        'grantee',
        'put',
        `api/actions/connector/${privateId}`,
        403,
        UPDATE_BODY
      );
      await expectStatus(api, 'grantee', 'delete', `api/actions/connector/${privateId}`, 403);
    }
  );

  apiTest(
    'lets a recovery administrator see, but not run, edit, or delete',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      await expectStatus(api, 'admin', 'get', `api/actions/connector/${privateId}`, 200);
      await expectStatus(
        api,
        'admin',
        'post',
        `api/actions/connector/${privateId}/_execute`,
        403,
        EXECUTE_BODY
      );
      await expectStatus(
        api,
        'admin',
        'put',
        `api/actions/connector/${privateId}`,
        403,
        UPDATE_BODY
      );
      await expectStatus(api, 'admin', 'delete', `api/actions/connector/${privateId}`, 403);
    }
  );

  apiTest(
    'limits an API key by both its creator grants and its own privileges',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      // The owner's key matches the owner, so it can view the private connector...
      await expectStatus(api, 'ownerKeyRead', 'get', `api/actions/connector/${privateId}`, 200);
      // ...but the key itself may only read connectors.
      await expectStatus(
        api,
        'ownerKeyRead',
        'put',
        `api/actions/connector/${privateId}`,
        403,
        UPDATE_BODY
      );
    }
  );

  apiTest(
    'reports a hidden caller-selected ID as missing, not as a conflict',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      const createAt = (persona: Persona) =>
        api.request(persona, 'post', `api/actions/connector/${privateId}`, {
          name: 'taken',
          connector_type_id: '.server-log',
          config: {},
          secrets: {},
        });

      expect(await createAt('stranger')).toHaveStatusCode(404);
      expect(await createAt('owner')).toHaveStatusCode(409);
    }
  );

  apiTest('deletes only for people who can edit', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const id = await api.createConnector('owner', {
      general_access: 'none',
      entries: [{ ...ctx.principal('grantee'), access: 'use' }],
    });

    await expectStatus(api, 'stranger', 'delete', `api/actions/connector/${id}`, 404);
    await expectStatus(api, 'grantee', 'delete', `api/actions/connector/${id}`, 403);
    await expectStatus(api, 'owner', 'delete', `api/actions/connector/${id}`, 204);
    await expectStatus(api, 'owner', 'get', `api/actions/connector/${id}`, 404);
  });
});
