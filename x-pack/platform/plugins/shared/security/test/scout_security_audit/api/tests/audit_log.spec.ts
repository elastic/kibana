/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';

import { apiTest, AUDIT_LOG_PATH, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const waitForAuditEvent = async (
  filter: (event: Record<string, unknown>) => boolean,
  timeoutMs = 10_000
): Promise<Record<string, unknown>> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const lines = readFileSync(AUDIT_LOG_PATH, 'utf8').split('\n').filter(Boolean);
      const events = lines.map((l) => JSON.parse(l) as Record<string, unknown>);
      const match = events.reverse().find(filter);
      if (match) return match;
    } catch {
      // file not yet created — retry
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for matching audit event in ${AUDIT_LOG_PATH}`);
};

apiTest.describe(
  'Audit log — ECS field shape (local file appender)',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    apiTest('user_login success: core ECS fields present', async ({ apiClient, samlAuth }) => {
      const testStart = Date.now();

      // samlAuth.asInteractiveUser triggers a real SAML login, emitting a user_login audit event.
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      // Confirm we have a usable session (forces the login to complete before we poll the file).
      await apiClient.get('api/status', { headers: { ...cookieHeader }, responseType: 'json' });

      const e = await waitForAuditEvent(
        (ev) =>
          (ev.event as Record<string, unknown>)?.action === 'user_login' &&
          (ev.event as Record<string, unknown>)?.outcome === 'success' &&
          new Date((ev['@timestamp'] as string) ?? 0).getTime() >= testStart
      );

      expect(e).toMatchObject({ event: { action: 'user_login', outcome: 'success' } });

      // ECS format: client.ip (not yet renamed to source.address — that's the OTel layer)
      const client = e.client as Record<string, unknown> | undefined;
      expect(client?.ip).toBeDefined();

      // ECS format: kibana.authentication_type (not yet renamed to authentication.type)
      const kibana = e.kibana as Record<string, unknown> | undefined;
      expect(kibana?.authentication_type).toBeDefined();

      // ECS format: kibana.session_id (not yet renamed to kibana.session.id)
      expect(kibana?.session_id).toBeDefined();
    });

    apiTest(
      'http_request: trace.id present, method lowercase (ECS), kibana.space_id set',
      async ({ apiClient, samlAuth }) => {
        const testStart = Date.now();
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        await apiClient.get('api/status', { headers: { ...cookieHeader }, responseType: 'json' });

        const e = await waitForAuditEvent(
          (ev) =>
            (ev.event as Record<string, unknown>)?.action === 'http_request' &&
            (ev.url as Record<string, unknown>)?.path === '/api/status' &&
            new Date((ev['@timestamp'] as string) ?? 0).getTime() >= testStart
        );

        expect(e).toMatchObject({ event: { action: 'http_request' } });

        // ECS format: trace.id (not yet renamed to request.id — that's the OTel layer)
        const trace = e.trace as Record<string, unknown> | undefined;
        expect(trace?.id).toBeDefined();

        // http.request.method is lowercase in ECS — uppercase is applied only by the OTel
        // appender via fieldUppercase, so non-OTel outputs retain the original route casing.
        const http = e.http as Record<string, unknown> | undefined;
        expect((http?.request as Record<string, unknown>)?.method).toBe('get');

        // ECS format: kibana.space_id (not yet renamed to kibana.space.id — that's the OTel layer)
        const kibana = e.kibana as Record<string, unknown> | undefined;
        expect(kibana?.space_id).toBeDefined();
      }
    );
  }
);
