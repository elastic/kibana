/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { EsClient } from '@kbn/scout';
import {
  createOlsTestContext,
  type OlsApi,
  type OlsTestContext,
  type Persona,
} from '../fixtures/personas';

const CONNECTOR_INDEX = '.kibana_alerting_cases';
// Kibana's own system user in the local Scout cluster, the only user that may write connector documents.
const KIBANA_SYSTEM_HEADERS = {
  authorization: `Basic ${Buffer.from('kibana_system:changeme').toString('base64')}`,
};
const accessPath = (id: string) => `internal/security/access_control/action/${id}`;

apiTest.describe('Connector access API', { tag: '@local-stateful-classic' }, () => {
  let ctx: OlsTestContext;

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient }) => {
    ctx = await createOlsTestContext({ apiClient, esClient, kbnClient });
  });

  apiTest.afterAll(async () => {
    await ctx.cleanup();
  });

  const getAccess = (api: OlsApi, persona: Persona, id: string) =>
    api.request(persona, 'get', accessPath(id));

  const replace = async (
    api: OlsApi,
    persona: Persona,
    id: string,
    body: { general_access: string; entries: unknown[] },
    version?: string
  ) =>
    api.request(persona, 'put', accessPath(id), {
      version: version ?? (await getAccess(api, 'owner', id)).body.version,
      ...body,
    });

  apiTest('returns the ACL only to people who can manage access', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const id = await api.createConnector('owner', {
      general_access: 'none',
      entries: [{ ...ctx.principal('grantee'), access: 'use' }],
    });

    const owner = await getAccess(api, 'owner', id);
    expect(owner).toHaveStatusCode(200);
    expect(owner.body).toMatchObject({
      state: 'valid',
      restricted: true,
      is_owner: true,
      can_claim: false,
      via_recovery: [],
      current_principal: ctx.principal('owner'),
    });
    expect(owner.body.permissions).toContain('manage_access');
    expect(owner.body.permissions).toContain('transfer');
    expect(owner.body.acl.owner.id).toStrictEqual([ctx.principal('owner').id]);
    expect(owner.body.profiles).toHaveLength(2);

    const grantee = await getAccess(api, 'grantee', id);
    expect(grantee).toHaveStatusCode(200);
    expect(grantee.body.permissions).toStrictEqual(['view', 'use']);
    expect(grantee.body.acl).toBeUndefined();
    expect(grantee.body.profiles).toBeUndefined();

    const admin = await getAccess(api, 'admin', id);
    expect(admin).toHaveStatusCode(200);
    expect(admin.body.via_recovery).toContain('manage_access');
    expect(admin.body.acl).toBeDefined();

    expect(await getAccess(api, 'stranger', id)).toHaveStatusCode(404);
  });

  apiTest(
    'replaces access, and warns about recipients without privileges',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      const id = await api.createConnector('owner');

      const response = await replace(api, 'owner', id, {
        general_access: 'none',
        entries: [
          { ...ctx.principal('grantee'), access: 'use' },
          { ...ctx.principal('noActions'), access: 'use' },
        ],
      });
      expect(response).toHaveStatusCode(200);
      // The grant is stored, but applies only once the recipient's role allows running connectors.
      expect(response.body.warnings).toStrictEqual([
        {
          principal: ctx.principal('noActions'),
          level: 'use',
          reason: 'missing_feature_privileges',
        },
      ]);

      expect(await api.request('grantee', 'get', `api/actions/connector/${id}`)).toHaveStatusCode(
        200
      );
      expect(await api.request('stranger', 'get', `api/actions/connector/${id}`)).toHaveStatusCode(
        404
      );
    }
  );

  apiTest('allows only the owner or recovery to change access', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const id = await api.createConnector('owner', {
      general_access: 'none',
      entries: [{ ...ctx.principal('grantee'), access: 'use' }],
    });
    const body = { general_access: 'edit', entries: [] };

    expect(await replace(api, 'stranger', id, body)).toHaveStatusCode(404);
    expect(await replace(api, 'grantee', id, body)).toHaveStatusCode(403);
    expect(
      await replace(api, 'admin', id, { general_access: 'none', entries: [] })
    ).toHaveStatusCode(200);
  });

  apiTest('rejects a stale version, without telling a stranger', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const id = await api.createConnector('owner', { general_access: 'none' });
    const { version } = (await getAccess(api, 'owner', id)).body;
    const grantee = { ...ctx.principal('grantee'), access: 'use' };
    expect(
      await replace(api, 'owner', id, { general_access: 'none', entries: [grantee] }, version)
    ).toHaveStatusCode(200);

    expect(
      await replace(api, 'owner', id, { general_access: 'none', entries: [] }, version)
    ).toHaveStatusCode(409);
    expect(
      await replace(api, 'stranger', id, { general_access: 'none', entries: [] }, version)
    ).toHaveStatusCode(404);
  });

  apiTest('validates the requested access', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const id = await api.createConnector('owner');
    const grantee = { ...ctx.principal('grantee'), access: 'use' };

    for (const body of [
      // Connectors can grant only `use`.
      { general_access: 'none', entries: [{ ...grantee, access: 'edit' }] },
      { general_access: 'view', entries: [] },
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
        await replace(api, 'owner', id, body),
        JSON.stringify(body).slice(0, 100)
      ).toHaveStatusCode(400);
    }
  });

  apiTest('accepts existing service accounts as recipients', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const id = await api.createConnector('owner');
    const created = await apiClient.post('internal/security/service_account', {
      headers: ctx.headers('admin'),
      responseType: 'json',
      body: { name: `ols-runner-${randomUUID().slice(0, 8)}`, roles: ['viewer'] },
    });
    expect(created).toHaveStatusCode(200);

    expect(
      await replace(api, 'owner', id, {
        general_access: 'none',
        entries: [{ type: 'service_account', id: created.body.id, access: 'use' }],
      })
    ).toHaveStatusCode(200);
    expect(
      await replace(api, 'owner', id, {
        general_access: 'none',
        entries: [{ type: 'service_account', id: 'kibana/does-not-exist', access: 'use' }],
      })
    ).toHaveStatusCode(400);
  });

  // Connectors created before object-level security was enabled have no ACL. They keep the type's
  // default access until someone with edit access claims them.
  const createLegacyConnector = async (api: OlsApi, esClient: EsClient) => {
    const id = await api.createConnector('owner');
    // The connector index is a restricted system index: only Kibana's own user may write it.
    await esClient.update(
      {
        index: CONNECTOR_INDEX,
        id: `action:${id}`,
        script: { source: "ctx._source.remove('acl')" },
        refresh: true,
      },
      { headers: KIBANA_SYSTEM_HEADERS }
    );
    return id;
  };

  apiTest(
    'keeps default access on a connector without an ACL, and lets any editor claim it',
    async ({ apiClient, esClient }) => {
      const api = ctx.api(apiClient);
      const id = await createLegacyConnector(api, esClient);

      const strangerView = await getAccess(api, 'stranger', id);
      expect(strangerView).toHaveStatusCode(200);
      expect(strangerView.body).toMatchObject({
        state: 'absent',
        restricted: false,
        can_claim: true,
      });
      expect(
        await api.request('stranger', 'put', `api/actions/connector/${id}`, {
          name: 'still public',
          config: {},
          secrets: {},
        })
      ).toHaveStatusCode(200);

      const claim = await api.request('stranger', 'post', `${accessPath(id)}/_claim`, {
        version: (await getAccess(api, 'stranger', id)).body.version,
        general_access: 'none',
      });
      expect(claim).toHaveStatusCode(200);

      // Claiming made the stranger the owner, and restricted the connector in the same step.
      expect((await getAccess(api, 'stranger', id)).body.is_owner).toBe(true);
      expect(await api.request('owner', 'get', `api/actions/connector/${id}`)).toHaveStatusCode(
        404
      );
    }
  );

  apiTest(
    'lets only one of two concurrent claims of a connector without an ACL succeed',
    async ({ apiClient, esClient }) => {
      const api = ctx.api(apiClient);
      const id = await createLegacyConnector(api, esClient);
      const { version } = (await getAccess(api, 'owner', id)).body;

      const results = await Promise.all(
        (['owner', 'grantee'] as const).map((persona) =>
          api.request(persona, 'post', `${accessPath(id)}/_claim`, { version })
        )
      );
      expect(results.map(({ statusCode }) => statusCode).sort()).toStrictEqual([200, 409]);
    }
  );

  apiTest(
    'does not let people who cannot edit claim a connector without an ACL',
    async ({ apiClient, esClient }) => {
      const api = ctx.api(apiClient);
      const id = await createLegacyConnector(api, esClient);
      const { body } = await getAccess(api, 'reader', id);
      expect(body.can_claim).toBe(false);
      expect(
        await api.request('reader', 'post', `${accessPath(id)}/_claim`, { version: body.version })
      ).toHaveStatusCode(403);
    }
  );

  apiTest('transfers ownership and removes the former owner access', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const id = await api.createConnector('owner', { general_access: 'none' });

    const transfer = await api.request('owner', 'post', `${accessPath(id)}/_transfer`, {
      version: (await getAccess(api, 'owner', id)).body.version,
      owner: ctx.principal('grantee'),
    });
    expect(transfer).toHaveStatusCode(200);

    expect(await api.request('owner', 'get', `api/actions/connector/${id}`)).toHaveStatusCode(404);
    const newOwner = await getAccess(api, 'grantee', id);
    expect(newOwner.body.is_owner).toBe(true);
    expect(newOwner.body.permissions).toContain('edit');
  });

  apiTest(
    'lets recovery transfer ownership of a connector it cannot edit',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      const id = await api.createConnector('owner', { general_access: 'none' });

      const transfer = await api.request('admin', 'post', `${accessPath(id)}/_transfer`, {
        version: (await getAccess(api, 'admin', id)).body.version,
        owner: ctx.principal('stranger'),
      });
      expect(transfer).toHaveStatusCode(200);
      expect(await api.request('stranger', 'get', `api/actions/connector/${id}`)).toHaveStatusCode(
        200
      );
      // Recovery still does not allow running or editing.
      expect(
        await api.request('admin', 'put', `api/actions/connector/${id}`, {
          name: 'x',
          config: {},
          secrets: {},
        })
      ).toHaveStatusCode(403);
    }
  );

  apiTest('returns the policy, and 404 for types without one', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const policy = await api.request(
      'reader',
      'get',
      'internal/security/access_control/action/_policy'
    );
    expect(policy).toHaveStatusCode(200);
    expect(policy.body).toMatchObject({
      enabled: true,
      general_access: { default: 'edit', allowed: ['none', 'use', 'edit'] },
      entry_levels: ['use'],
    });

    expect(
      await api.request('owner', 'get', 'internal/security/access_control/dashboard/_policy')
    ).toHaveStatusCode(404);
    expect(
      await api.request('noActions', 'get', 'internal/security/access_control/action/_policy')
    ).toHaveStatusCode(403);
  });

  apiTest('suggests users with the levels they can use', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const response = await api.request(
      'owner',
      'post',
      'internal/security/access_control/action/_suggest_principals',
      {
        name: 'OLS',
        size: 50,
      }
    );
    expect(response).toHaveStatusCode(200);

    const byUid = new Map(
      (response.body.users as Array<{ uid: string; eligible_levels: string[] }>).map((user) => [
        user.uid,
        user.eligible_levels,
      ])
    );
    expect(byUid.get(ctx.principal('grantee').id)).toStrictEqual(['use']);
    expect(byUid.get(ctx.principal('noActions').id)).toStrictEqual([]);

    expect(
      await api.request(
        'reader',
        'post',
        'internal/security/access_control/action/_suggest_principals',
        {
          name: 'OLS',
        }
      )
    ).toHaveStatusCode(403);
  });
});
