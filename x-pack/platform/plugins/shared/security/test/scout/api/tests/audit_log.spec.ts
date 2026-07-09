/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout audit log integration tests.
 *
 * Prerequisites: Kibana must be configured with the OTel audit appender:
 *   xpack.security.audit.enabled: true
 *   xpack.security.audit.appender.type: otel
 *   (plus an OTel collector that indexes into Elasticsearch)
 *
 * AUDIT_LOG_INDEX must match the data stream the OTel collector writes to.
 * ES _source is assumed to have nested field paths (standard Elasticsearch mapping).
 *
 * Assertions reflect the field renames, drops, and defaults in AUDIT_OTEL_FIELD_RENAMES,
 * AUDIT_OTEL_FIELD_DROPS, and AUDIT_OTEL_FIELD_DEFAULTS from audit_service.ts.
 */

import type { Client } from '@elastic/elasticsearch';

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

// Adjust to match your OTel collector's output data stream.
const AUDIT_LOG_INDEX = 'logs-*';
const KBN_XSRF = { 'kbn-xsrf': 'xxx' };
const recentTimestamp = { range: { '@timestamp': { gte: 'now-30s' } } };

/**
 * Polls ES until an audit document matching `query` appears, then returns _source as `any`.
 * Retries up to `timeoutMs` to account for the OTel batch flush delay.
 */
const waitForAuditEvent = async (
  esClient: Client,
  query: Record<string, unknown>,
  timeoutMs = 15_000
): Promise<any> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await esClient.search({ index: AUDIT_LOG_INDEX, size: 1, query });
    const source = result.hits?.hits?.[0]?._source;
    if (source) return source;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Timed out waiting for audit event: ${JSON.stringify(query)} in ${AUDIT_LOG_INDEX}`
  );
};

apiTest.describe('Audit log — OTel field shape', { tag: tags.serverless.security.complete }, () => {
  apiTest(
    'user_login success: renamed OTel fields, event.type default applied',
    async ({ apiClient, esClient, config }) => {
      const { username, password } = config.auth;

      await apiClient.post('internal/security/login', {
        headers: { ...KBN_XSRF, 'X-Forwarded-For': '1.2.3.4, 5.6.7.8' },
        body: {
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username, password },
        },
        responseType: 'json',
      });

      const e = await waitForAuditEvent(esClient, {
        bool: {
          must: [
            { term: { 'event.action': 'user_login' } },
            { term: { 'event.outcome': 'success' } },
            { term: { 'user.name': username } },
            recentTimestamp,
          ],
        },
      });

      // Core RFC fields
      expect(e).toMatchObject({
        event: { action: 'user_login', outcome: 'success' },
      });

      // fieldDefaults: auth events with no event.type get ['access']
      expect(e.event.type).toMatchObject(['access']);

      // AUDIT_OTEL_FIELD_RENAMES: client.ip → source.address + source.ip
      expect(e.source?.address).toBeDefined();
      expect(e.source?.ip).toBeDefined();
      expect(e.client?.ip).toBeUndefined();

      // AUDIT_OTEL_FIELD_RENAMES: kibana.authentication_type → authentication.type
      expect(e).toMatchObject({ authentication: { type: 'basic' } });
      expect(e.kibana?.authentication_type).toBeUndefined();

      // AUDIT_OTEL_FIELD_RENAMES: kibana.space_id → kibana.space.id
      expect(e.kibana?.space?.id).toBeDefined();
      expect(e.kibana?.space_id).toBeUndefined();

      // AUDIT_OTEL_FIELD_RENAMES: kibana.session_id → kibana.session.id
      expect(e.kibana?.session?.id).toBeDefined();
      expect(e.kibana?.session_id).toBeUndefined();

      // AUDIT_OTEL_FIELD_RENAMES: kibana.lookup_realm → kibana.lookup.realm
      expect(e.kibana?.lookup?.realm).toBeDefined();
      expect(e.kibana?.lookup_realm).toBeUndefined();

      // AUDIT_OTEL_FIELD_DROPS: service.version and host.name excluded
      expect(e.service?.version).toBeUndefined();
      expect(e.host?.name).toBeUndefined();

      // Header rename: http.request.headers.x-forwarded-for → http.request.header.x-forwarded-for
      expect(e.http?.request?.header?.['x-forwarded-for']).toBeDefined();
      expect(e.http?.request?.headers?.['x-forwarded-for']).toBeUndefined();
    }
  );

  apiTest(
    'user_login failure: outcome=failure, no user fields',
    async ({ apiClient, esClient, config }) => {
      const { username } = config.auth;

      await apiClient.post('internal/security/login', {
        headers: { ...KBN_XSRF },
        body: {
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username, password: 'definitely-wrong' },
        },
        responseType: 'json',
      });

      const e = await waitForAuditEvent(esClient, {
        bool: {
          must: [
            { term: { 'event.action': 'user_login' } },
            { term: { 'event.outcome': 'failure' } },
            recentTimestamp,
          ],
        },
      });

      expect(e).toMatchObject({ event: { action: 'user_login', outcome: 'failure' } });
      expect(e.user?.name).toBeUndefined();
    }
  );

  apiTest(
    'http_request: request.id present (not trace.id), HTTP method uppercase',
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      await apiClient.get('api/status', {
        headers: { ...cookieHeader },
        responseType: 'json',
      });

      const e = await waitForAuditEvent(esClient, {
        bool: {
          must: [
            { term: { 'event.action': 'http_request' } },
            { term: { 'url.path': '/api/status' } },
            recentTimestamp,
          ],
        },
      });

      expect(e).toMatchObject({ event: { action: 'http_request' } });

      // AUDIT_OTEL_FIELD_RENAMES: trace.id → request.id (avoids OTel TraceId collision)
      expect(e.request?.id).toBeDefined();
      expect(e.trace?.id).toBeUndefined();

      // http.request.method must be uppercase per OTel semantic conventions
      expect(e).toMatchObject({ http: { request: { method: 'GET' } } });
    }
  );

  apiTest(
    'saved_object_find: kibana.space.id present (not kibana.space_id)',
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      await apiClient.get('api/saved_objects/_find?type=dashboard&per_page=1', {
        headers: { ...cookieHeader },
        responseType: 'json',
      });

      const e = await waitForAuditEvent(esClient, {
        bool: {
          must: [
            { term: { 'event.action': 'saved_object_find' } },
            { term: { 'kibana.saved_object.type': 'dashboard' } },
            recentTimestamp,
          ],
        },
      });

      expect(e).toMatchObject({ event: { action: 'saved_object_find', outcome: 'success' } });

      // AUDIT_OTEL_FIELD_RENAMES: kibana.space_id → kibana.space.id
      expect(e).toMatchObject({ kibana: { space: { id: 'default' } } });
      expect(e.kibana?.space_id).toBeUndefined();

      // AUDIT_OTEL_FIELD_DROPS
      expect(e.service?.version).toBeUndefined();
      expect(e.host?.name).toBeUndefined();
    }
  );

  apiTest(
    'user_logout: event.type default applied, authentication.type present',
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      await apiClient.get('api/security/logout', { headers: { ...cookieHeader } });

      const e = await waitForAuditEvent(esClient, {
        bool: {
          must: [{ term: { 'event.action': 'user_logout' } }, recentTimestamp],
        },
      });

      expect(e).toMatchObject({ event: { action: 'user_logout' } });
      // fieldDefaults: auth events get event.type: ['access']
      expect(e.event.type).toMatchObject(['access']);
      // AUDIT_OTEL_FIELD_RENAMES: kibana.authentication_type → authentication.type
      expect(e.authentication?.type).toBeDefined();
      expect(e.kibana?.authentication_type).toBeUndefined();
    }
  );
});
