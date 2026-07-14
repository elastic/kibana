/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { OtlpLogReceiver } from '../lib/otlp_log_receiver';

// Must match OTEL_RECEIVER_PORT in the security_audit_otel Scout config set.
const OTEL_RECEIVER_PORT = 18923;

const KBN_XSRF = { 'kbn-xsrf': 'xxx', 'x-elastic-internal-origin': 'kibana' };
const TEST_DASHBOARD_ID = 'audit-log-otel-test-dashboard';

const receiver = new OtlpLogReceiver();

apiTest.describe(
  'Audit log — OTel field shape',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    apiTest.beforeAll(async ({ kbnClient }) => {
      await receiver.start(OTEL_RECEIVER_PORT);
      await kbnClient.savedObjects.create({
        type: 'dashboard',
        id: TEST_DASHBOARD_ID,
        overwrite: true,
        attributes: {
          title: 'Audit log OTel test dashboard',
        },
      });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.delete({ type: 'dashboard', id: TEST_DASHBOARD_ID });
      await receiver.stop();
    });

    apiTest(
      'user_login success: renamed OTel fields, event.type default applied',
      async ({ apiClient, config }) => {
        const snap = receiver.snapshot();
        const { username, password } = config.auth;

        await apiClient.post('internal/security/login', {
          headers: { ...KBN_XSRF, 'X-Forwarded-For': '1.2.3.4, 5.6.7.8' },
          body: {
            providerType: 'basic',
            providerName: 'cloud-basic',
            currentURL: '/',
            params: { username, password },
          },
          responseType: 'json',
        });

        const e = await snap.waitForLogRecord(
          (attrs) =>
            attrs['event.action'] === 'user_login' &&
            attrs['event.outcome'] === 'success' &&
            attrs['user.name'] === username
        );

        // Core audit fields
        expect(e['event.action']).toBe('user_login');
        expect(e['event.outcome']).toBe('success');

        // fieldDefaults: auth events with no event.type get ['access']
        expect(e['event.type']).toStrictEqual(['access']);

        // AUDIT_OTEL_FIELD_RENAMES: client.ip → source.address + source.ip
        expect(e['source.address']).toBeDefined();
        expect(e['source.ip']).toBeDefined();
        expect(e['client.ip']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.authentication_type → authentication.type
        expect(e['authentication.type']).toBe('basic');
        expect(e['kibana.authentication_type']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.space_id → kibana.space.id — not asserted here:
        // space isn't meaningful at authentication time, so login events intentionally omit
        // it (verified separately via the http_request and saved_object_find tests below).
        expect(e['kibana.space_id']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.session_id → kibana.session.id
        expect(e['kibana.session.id']).toBeDefined();
        expect(e['kibana.session_id']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.lookup_realm → kibana.lookup.realm
        expect(e['kibana.lookup.realm']).toBeDefined();
        expect(e['kibana.lookup_realm']).toBeUndefined();

        // AUDIT_OTEL_FIELD_DROPS: service.version and host.name excluded
        expect(e['service.version']).toBeUndefined();
        expect(e['host.name']).toBeUndefined();

        // Header rename: http.request.headers.x-forwarded-for → http.request.header.x-forwarded-for
        expect(e['http.request.header.x-forwarded-for']).toBeDefined();
        expect(e['http.request.headers.x-forwarded-for']).toBeUndefined();
      }
    );

    apiTest(
      'user_login failure: outcome=failure, no user fields',
      async ({ apiClient, config }) => {
        const snap = receiver.snapshot();
        const { username } = config.auth;

        await apiClient.post('internal/security/login', {
          headers: { ...KBN_XSRF },
          body: {
            providerType: 'basic',
            providerName: 'cloud-basic',
            currentURL: '/',
            params: { username, password: 'definitely-wrong' },
          },
          responseType: 'json',
        });

        const e = await snap.waitForLogRecord(
          (attrs) => attrs['event.action'] === 'user_login' && attrs['event.outcome'] === 'failure'
        );

        expect(e['event.action']).toBe('user_login');
        expect(e['event.outcome']).toBe('failure');
        expect(e['user.name']).toBeUndefined();
      }
    );

    apiTest(
      'http_request: request.id present (not trace.id), HTTP method uppercase',
      async ({ apiClient, samlAuth }) => {
        const snap = receiver.snapshot();
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        await apiClient.get('api/status', {
          headers: { ...cookieHeader },
          responseType: 'json',
        });

        const e = await snap.waitForLogRecord(
          (attrs) => attrs['event.action'] === 'http_request' && attrs['url.path'] === '/api/status'
        );

        expect(e['event.action']).toBe('http_request');

        // AUDIT_OTEL_FIELD_RENAMES: trace.id → request.id (avoids OTel TraceId collision)
        expect(e['request.id']).toBeDefined();
        expect(e['trace.id']).toBeUndefined();

        // http.request.method must be uppercase per OTel semantic conventions
        expect(e['http.request.method']).toBe('GET');
      }
    );

    apiTest(
      'saved_object_find: kibana.space.id present (not kibana.space_id)',
      async ({ apiClient, samlAuth }) => {
        const snap = receiver.snapshot();
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        // per_page is large so our seeded dashboard is guaranteed to be in the result set —
        // Kibana emits a saved_object_find audit event per *returned* object, and with a
        // small page size some other pre-existing dashboard (e.g. auto-installed sample
        // content) could be returned instead of ours.
        await apiClient.get('api/saved_objects/_find?type=dashboard&per_page=10000', {
          headers: { ...cookieHeader, 'x-elastic-internal-origin': 'kibana' },
          responseType: 'json',
        });

        const e = await snap.waitForLogRecord(
          (attrs) =>
            attrs['event.action'] === 'saved_object_find' &&
            attrs['kibana.saved_object.type'] === 'dashboard' &&
            attrs['kibana.saved_object.id'] === TEST_DASHBOARD_ID
        );

        expect(e['event.action']).toBe('saved_object_find');
        expect(e['event.outcome']).toBe('success');

        // AUDIT_OTEL_FIELD_RENAMES: kibana.space_id → kibana.space.id
        expect(e['kibana.space.id']).toBe('default');
        expect(e['kibana.space_id']).toBeUndefined();

        // AUDIT_OTEL_FIELD_DROPS
        expect(e['service.version']).toBeUndefined();
        expect(e['host.name']).toBeUndefined();
      }
    );

    apiTest(
      'user_logout: event.type default applied, authentication.type present',
      async ({ apiClient, samlAuth }) => {
        const snap = receiver.snapshot();
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        await apiClient.get('api/security/logout', { headers: { ...cookieHeader } });

        const e = await snap.waitForLogRecord((attrs) => attrs['event.action'] === 'user_logout');

        expect(e['event.action']).toBe('user_logout');
        // fieldDefaults: auth events get event.type: ['access']
        expect(e['event.type']).toStrictEqual(['access']);
        // AUDIT_OTEL_FIELD_RENAMES: kibana.authentication_type → authentication.type
        expect(e['authentication.type']).toBeDefined();
        expect(e['kibana.authentication_type']).toBeUndefined();
      }
    );
  }
);
