/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile, stat } from 'node:fs/promises';
import { OLS_POC_AUDIT_LOG_PATH, apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createOlsTestContext, type OlsTestContext } from '../fixtures/personas';

interface AuditRecord {
  message: string;
  event: { action: string; outcome: string };
  user?: { name?: string };
  kibana?: { saved_object?: { type: string; id: string }; space_id?: string };
}

/**
 * Returns the audit records written since `offset`, waiting briefly for the file appender.
 */
const readAuditSince = async (offset: number, until: (records: AuditRecord[]) => boolean) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const content = (await readFile(OLS_POC_AUDIT_LOG_PATH)).subarray(offset).toString('utf8');
    const records = content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditRecord);
    if (until(records)) {
      return records;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Expected audit records were not written in time');
};

const getAuditOffset = async () => (await stat(OLS_POC_AUDIT_LOG_PATH)).size;

apiTest.describe('Object-level security audit', { tag: '@local-stateful-classic' }, () => {
  let ctx: OlsTestContext;
  let privateId: string;
  let connectorName: string;

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient }) => {
    ctx = await createOlsTestContext({ apiClient, esClient, kbnClient });
    const api = ctx.api(apiClient);
    privateId = await api.createConnector('owner', {
      general_access: 'none',
      entries: [{ ...ctx.principal('grantee'), access: 'use' }],
    });
    connectorName = (await api.request('owner', 'get', `api/actions/connector/${privateId}`)).body
      .name;
  });

  apiTest.afterAll(async () => {
    await ctx.cleanup();
  });

  const forObject = (records: AuditRecord[], action: string) =>
    records.filter(
      (record) => record.event.action === action && record.kibana?.saved_object?.id === privateId
    );

  apiTest('logs denials, including masked 404s, without titles', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const offset = await getAuditOffset();
    expect(
      await api.request('stranger', 'get', `api/actions/connector/${privateId}`)
    ).toHaveStatusCode(404);

    const records = await readAuditSince(
      offset,
      (r) => forObject(r, 'access_control_denied').length > 0
    );
    const [denied] = forObject(records, 'access_control_denied');
    expect(denied.event.outcome).toBe('failure');
    expect(denied.kibana?.space_id).toBe(ctx.spaceId);
    expect(denied.message).not.toContain(connectorName);
  });

  apiTest('logs restricted access that relied on a grant', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    const offset = await getAuditOffset();
    expect(
      await api.request('grantee', 'post', `api/actions/connector/${privateId}/_execute`, {
        params: { message: 'audit' },
      })
    ).toHaveStatusCode(200);

    const records = await readAuditSince(
      offset,
      (r) => forObject(r, 'access_control_access').length > 0
    );
    expect(forObject(records, 'access_control_access')[0].event.outcome).toBe('success');
  });

  apiTest(
    'logs recovery once per list, and access changes with before and after',
    async ({ apiClient }) => {
      const api = ctx.api(apiClient);
      const offset = await getAuditOffset();
      expect(await api.request('admin', 'get', 'api/actions/connectors')).toHaveStatusCode(200);
      await api.setAccess(privateId, { general_access: 'use' });

      const records = await readAuditSince(
        offset,
        (r) => forObject(r, 'access_control_update').length > 0
      );
      const overrides = records.filter(
        ({ event, kibana }) =>
          event.action === 'access_control_admin_override' && !kibana?.saved_object
      );
      expect(overrides).toHaveLength(1);

      const [update] = forObject(records, 'access_control_update');
      expect(update.message).toContain('general access: none -> use');
    }
  );

  apiTest('logs a hidden object only as an object-level denial', async ({ apiClient }) => {
    const api = ctx.api(apiClient);
    await api.setAccess(privateId, { general_access: 'none' });
    const offset = await getAuditOffset();

    // Saved Objects Management reads through the security extension, which audits each read
    // object. For an object hidden by its ACL, only the denial is kept.
    const response = await api.request(
      'somAll',
      'post',
      'api/kibana/management/saved_objects/_bulk_get',
      [{ type: 'action', id: privateId }]
    );
    expect(response).toHaveStatusCode(200);
    expect(response.body[0].error.statusCode).toBe(404);

    const records = await readAuditSince(
      offset,
      (r) => forObject(r, 'access_control_denied').length > 0
    );
    expect(
      records.filter(
        ({ event, kibana }) =>
          event.action.startsWith('saved_object_') && kibana?.saved_object?.id === privateId
      )
    ).toHaveLength(0);
  });
});
