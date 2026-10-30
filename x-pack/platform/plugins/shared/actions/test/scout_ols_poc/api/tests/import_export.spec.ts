/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { ApiClientFixture } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createOlsTestContext, type OlsTestContext, type Persona } from '../fixtures/personas';

apiTest.describe('Connector import and export', { tag: '@local-stateful-classic' }, () => {
  let ctx: OlsTestContext;
  let publicId: string;
  let privateId: string;

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient }) => {
    ctx = await createOlsTestContext({ apiClient, esClient, kbnClient });
    const api = ctx.api(apiClient);
    publicId = await api.createConnector('owner');
    privateId = await api.createConnector('owner', { general_access: 'none' });
  });

  apiTest.afterAll(async () => {
    await ctx.cleanup();
  });

  const exportConnectors = async (apiClient: ApiClientFixture, persona: Persona) => {
    const response = await apiClient.post(ctx.path('api/saved_objects/_export'), {
      headers: ctx.headers(persona),
      body: { type: ['action'], excludeExportDetails: true },
      responseType: 'text',
    });
    expect(response).toHaveStatusCode(200);
    return (response.body as string)
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  };

  const importConnectors = async (
    apiClient: ApiClientFixture,
    persona: Persona,
    objects: unknown[],
    overwrite: boolean
  ) => {
    const boundary = `----ols${randomUUID().replace(/-/g, '')}`;
    const ndjson = objects.map((object) => JSON.stringify(object)).join('\n');
    const response = await apiClient.post(
      ctx.path(`api/saved_objects/_import?overwrite=${overwrite}`),
      {
        headers: {
          ...ctx.headers(persona),
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: [
          `--${boundary}`,
          'Content-Disposition: form-data; name="file"; filename="connectors.ndjson"',
          'Content-Type: application/ndjson',
          '',
          ndjson,
          `--${boundary}--`,
          '',
        ].join('\r\n'),
        responseType: 'json',
      }
    );
    expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
    return response.body;
  };

  apiTest(
    'never exports ACLs, and never exports connectors the caller cannot view',
    async ({ apiClient }) => {
      const ownerExport = await exportConnectors(apiClient, 'owner');
      const ownerIds = ownerExport.map(({ id }) => id);
      expect(ownerIds).toContain(publicId);
      expect(ownerIds).toContain(privateId);
      expect(ownerExport.some((object) => 'acl' in object)).toBe(false);

      // Saved Objects Management privileges in all spaces do not bypass object-level security.
      for (const persona of ['stranger', 'somAll'] as const) {
        const ids = (await exportConnectors(apiClient, persona)).map(({ id }) => id);
        expect(ids).toContain(publicId);
        expect(ids).not.toContain(privateId);
      }
    }
  );

  apiTest(
    'makes the importer the owner of new connectors, and ignores ACLs in files',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      const [exported] = (await exportConnectors(apiClient, 'owner')).filter(
        ({ id }) => id === publicId
      );
      const id = randomUUID();
      // A file cannot grant access: a forged ACL is dropped and the destination rules apply.
      const forged = {
        ...exported,
        id,
        acl: { version: 1, owner: { type: 'user', id: 'u_forged' }, general_access: 'none' },
      };

      const result = await importConnectors(apiClient, 'grantee', [forged], false);
      expect(result.success).toBe(true);

      const { body } = await api.request(
        'grantee',
        'get',
        `internal/security/access_control/action/${id}`
      );
      expect(body.is_owner).toBe(true);
      expect(body.acl.general_access).toStrictEqual(['edit']);
    }
  );

  apiTest('keeps the destination access on overwrite', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const [exported] = (await exportConnectors(apiClient, 'owner')).filter(
      ({ id }) => id === privateId
    );

    const result = await importConnectors(apiClient, 'owner', [exported], true);
    expect(result.success).toBe(true);

    expect(
      await api.request('stranger', 'get', `api/actions/connector/${privateId}`)
    ).toHaveStatusCode(404);
    const { body } = await api.request(
      'owner',
      'get',
      `internal/security/access_control/action/${privateId}`
    );
    expect(body.is_owner).toBe(true);
    expect(body.restricted).toBe(true);
  });

  apiTest('does not let a stranger overwrite a connector it cannot see', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const [exported] = (await exportConnectors(apiClient, 'owner')).filter(
      ({ id }) => id === privateId
    );

    // With or without overwrite, the hidden ID looks unused rather than conflicting.
    for (const overwrite of [true, false]) {
      const result = await importConnectors(apiClient, 'stranger', [exported], overwrite);
      expect(result.success).toBe(false);
      expect(result.errors[0]).toMatchObject({ id: privateId, error: { type: 'unknown' } });
    }
    expect(
      await api.request('owner', 'get', `api/actions/connector/${privateId}`)
    ).toHaveStatusCode(200);
  });
});
