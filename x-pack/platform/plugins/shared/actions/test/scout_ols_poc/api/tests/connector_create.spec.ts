/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createOlsTestContext, type OlsApi, type OlsTestContext } from '../fixtures/personas';

apiTest.describe('Connector creation with access', { tag: '@local-stateful-classic' }, () => {
  let ctx: OlsTestContext;

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient }) => {
    ctx = await createOlsTestContext({ apiClient, esClient, kbnClient });
  });

  apiTest.afterAll(async () => {
    await ctx.cleanup();
  });

  const create = (api: OlsApi, accessControl: unknown) =>
    api.request('owner', 'post', 'api/actions/connector', {
      name: `ols create ${randomUUID().slice(0, 4)}`,
      connector_type_id: '.server-log',
      config: {},
      secrets: {},
      access_control: accessControl,
    });

  apiTest('makes the creator the owner of every new connector', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const id = await api.createConnector('owner');

    const { body } = await api.request(
      'owner',
      'get',
      `internal/security/access_control/action/${id}`
    );
    expect(body).toMatchObject({ state: 'valid', restricted: false, is_owner: true });
    expect(body.acl.general_access).toStrictEqual(['edit']);
  });

  apiTest(
    'creates a private connector in one request, never visible to others',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      const response = await create(api, {
        general_access: 'none',
        entries: [{ ...ctx.principal('grantee'), access: 'use' }],
      });
      expect(response).toHaveStatusCode(200);
      const { id } = response.body;

      // Checked right after the create: there is no window in which the connector is public.
      expect(await api.request('stranger', 'get', `api/actions/connector/${id}`)).toHaveStatusCode(
        404
      );
      expect(await api.request('grantee', 'get', `api/actions/connector/${id}`)).toHaveStatusCode(
        200
      );

      const { body } = await api.request(
        'owner',
        'get',
        `internal/security/access_control/action/${id}`
      );
      expect(body.acl.entries).toHaveLength(1);
      expect(body.acl.entries[0].id).toStrictEqual([ctx.principal('grantee').id]);
    }
  );

  apiTest('rejects invalid access before creating anything', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const grantee = { ...ctx.principal('grantee'), access: 'use' };
    const before = (await api.request('owner', 'get', 'api/actions/connectors')).body.length;

    for (const accessControl of [
      { general_access: 'view' },
      { general_access: 'none', entries: [{ ...grantee, access: 'edit' }] },
      { general_access: 'none', entries: [grantee, grantee] },
      {
        general_access: 'none',
        entries: [{ type: 'user', id: `u_${randomUUID()}`, access: 'use' }],
      },
      {
        general_access: 'none',
        entries: Array.from({ length: 101 }, (_, index) => ({
          type: 'user',
          id: `u_${index}`,
          access: 'use',
        })),
      },
    ]) {
      expect(
        await create(api, accessControl),
        JSON.stringify(accessControl).slice(0, 80)
      ).toHaveStatusCode(400);
    }

    expect((await api.request('owner', 'get', 'api/actions/connectors')).body).toHaveLength(before);
  });

  apiTest('keeps the creator out of the named entries', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const response = await create(api, {
      general_access: 'none',
      entries: [{ ...ctx.principal('owner'), access: 'use' }],
    });
    expect(response).toHaveStatusCode(200);

    const { body } = await api.request(
      'owner',
      'get',
      `internal/security/access_control/action/${response.body.id}`
    );
    expect(body.acl.entries).toHaveLength(0);
  });
});
