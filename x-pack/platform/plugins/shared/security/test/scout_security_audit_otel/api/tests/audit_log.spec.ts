/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, OTEL_RECEIVER_PORT, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { type FlatAttributes, OtlpLogReceiver } from '../lib/otlp_log_receiver';

const KBN_XSRF = { 'kbn-xsrf': 'xxx', 'x-elastic-internal-origin': 'kibana' };
const TEST_DASHBOARD_ID = 'audit-log-otel-test-dashboard';

const receiver = new OtlpLogReceiver();

/**
 * Asserts the OTel envelope and resource-level fields that are identical across all audit events.
 * These are set by the OTel SDK / resource detectors, not by the individual audit event — they
 * don't need to be re-verified in every test case.
 */
const expectOtelEnvelope = (e: FlatAttributes) => {
  // OTLP envelope fields — top-level log record fields, not logRecord.attributes.
  expect(e.severityNumber).toBe(9); // SeverityNumber.INFO
  expect(e.severityText).toBe('INFO');
  // Resource-level fields (process.pid, host.id, os.version, etc. are environment-specific; omitted).
  expect(e['service.name']).toBe('kibana');
  expect(e['telemetry.sdk.language']).toBe('nodejs');
  expect(e['process.runtime.name']).toBe('nodejs');
  expect(e['process.runtime.description']).toBe('Node.js');
  // Log-record instrumentation fields.
  expect(e['log.logger']).toBe('plugins.security.audit.ecs');
  expect(e['service.type']).toBe('kibana');
};

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

        expectOtelEnvelope(e);
        expect(e.body).toMatch(/logged in/);

        // AUDIT_OTEL_FIELD_DROPS: service.version and host.name excluded from both
        // log record attributes and resource attributes. Verified once for the appender.
        expect(e['service.version']).toBeUndefined();
        expect(e['host.name']).toBeUndefined();

        // Core audit fields.
        expect(e['event.action']).toBe('user_login');
        expect(e['event.outcome']).toBe('success');
        expect(e['event.category']).toStrictEqual(['authentication']);
        // fieldDefaults: auth events carry no event.type — default supplies ['access'].
        expect(e['event.type']).toStrictEqual(['access']);

        // User identity.
        expect(e['user.name']).toBe(username);
        expect(e['user.id']).toBeDefined();
        expect(e['user.roles']).toStrictEqual(['superuser']);

        // Auth context — kibana.authentication_provider is not renamed.
        expect(e['kibana.authentication_provider']).toBe('cloud-basic');
        expect(e['kibana.authentication_realm']).toBeDefined(); // realm name varies by deployment type

        // AUDIT_OTEL_FIELD_RENAMES: kibana.authentication_type → authentication.type.
        expect(e['authentication.type']).toBe('basic');
        expect(e['kibana.authentication_type']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.space_id → kibana.space.id — not asserted here:
        // space isn't meaningful at authentication time, so login events intentionally omit it.
        expect(e['kibana.space_id']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.session_id → kibana.session.id.
        expect(e['kibana.session.id']).toBeDefined();
        expect(e['kibana.session_id']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.lookup_realm → kibana.lookup.realm.
        expect(e['kibana.lookup.realm']).toBeDefined();
        expect(e['kibana.lookup_realm']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: client.ip → source.address + source.ip.
        expect(e['source.address']).toBeDefined();
        expect(e['source.ip']).toBeDefined();
        expect(e['client.ip']).toBeUndefined();

        // Header rename: http.request.headers.x-forwarded-for → http.request.header.x-forwarded-for.
        expect(e['http.request.header.x-forwarded-for']).toBeDefined();
        expect(e['http.request.headers.x-forwarded-for']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: trace.id → request.id.
        expect(e['request.id']).toBeDefined();
        expect(e['trace.id']).toBeUndefined();
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

        expectOtelEnvelope(e);
        expect(typeof e.body).toBe('string');

        // Core audit fields.
        expect(e['event.action']).toBe('user_login');
        expect(e['event.outcome']).toBe('failure');
        expect(e['event.category']).toStrictEqual(['authentication']);
        // fieldDefaults applies event.type even to failed login attempts.
        expect(e['event.type']).toStrictEqual(['access']);

        // No user fields on a failed authentication attempt.
        expect(e['user.name']).toBeUndefined();
        expect(e['user.id']).toBeUndefined();

        // Auth context still present even on failure.
        expect(e['kibana.authentication_provider']).toBe('cloud-basic');
        expect(e['authentication.type']).toBe('basic');

        // Error details.
        expect(e['error.code']).toBe('ResponseError');
        expect(e['error.message']).toMatch(/security_exception/);

        // Network.
        expect(e['source.address']).toBeDefined();
        expect(e['source.ip']).toBeDefined();
        expect(e['request.id']).toBeDefined();
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

        expectOtelEnvelope(e);
        expect(e.body).toMatch(/requesting/);

        // Core audit fields.
        expect(e['event.action']).toBe('http_request');
        expect(e['event.category']).toStrictEqual(['web']);
        // http_request events have outcome 'unknown' — the request is in-flight when audited.
        expect(e['event.outcome']).toBe('unknown');
        // fieldDefaults applies event.type (http_request carries no explicit type).
        expect(e['event.type']).toStrictEqual(['access']);

        // Request URL.
        expect(e['url.path']).toBe('/api/status');
        expect(e['url.domain']).toBe('localhost');
        expect(e['url.port']).toBe(5620);
        expect(e['url.scheme']).toBe('http');

        // http.request.method must be uppercase per OTel semantic conventions.
        expect(e['http.request.method']).toBe('GET');

        // Authenticated user.
        expect(e['user.name']).toBeDefined();
        expect(e['user.id']).toBeDefined();
        expect(Array.isArray(e['user.roles'])).toBe(true);

        // Kibana context.
        expect(e['kibana.space.id']).toBe('default');
        expect(e['kibana.session.id']).toBeDefined();

        // Network.
        expect(e['source.address']).toBe('127.0.0.1');
        expect(e['source.ip']).toBe('127.0.0.1');

        // AUDIT_OTEL_FIELD_RENAMES: trace.id → request.id (avoids OTel TraceId collision).
        expect(e['request.id']).toBeDefined();
        expect(e['trace.id']).toBeUndefined();
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

        expectOtelEnvelope(e);
        expect(e.body).toMatch(/accessed/);

        // Core audit fields.
        expect(e['event.action']).toBe('saved_object_find');
        expect(e['event.outcome']).toBe('success');
        expect(e['event.category']).toStrictEqual(['database']);
        // event.type is explicitly set by the saved_object_find event (not via fieldDefaults).
        expect(e['event.type']).toStrictEqual(['access']);

        // Saved object identity.
        expect(e['kibana.saved_object.type']).toBe('dashboard');
        expect(e['kibana.saved_object.id']).toBe(TEST_DASHBOARD_ID);

        // Authenticated user.
        expect(e['user.name']).toBeDefined();
        expect(e['user.id']).toBeDefined();
        expect(Array.isArray(e['user.roles'])).toBe(true);

        // AUDIT_OTEL_FIELD_RENAMES: kibana.space_id → kibana.space.id.
        expect(e['kibana.space.id']).toBe('default');
        expect(e['kibana.space_id']).toBeUndefined();

        // Kibana context.
        expect(e['kibana.session.id']).toBeDefined();

        // Network.
        expect(e['source.address']).toBe('127.0.0.1');
        expect(e['source.ip']).toBe('127.0.0.1');
        expect(e['request.id']).toBeDefined();
      }
    );

    apiTest(
      'user_logout: event.type default applied, authentication.type present',
      async ({ apiClient, samlAuth }) => {
        const snap = receiver.snapshot();
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        await apiClient.get('api/security/logout', { headers: { ...cookieHeader } });

        const e = await snap.waitForLogRecord((attrs) => attrs['event.action'] === 'user_logout');

        expectOtelEnvelope(e);
        expect(e.body).toMatch(/logging out/);

        // Core audit fields.
        expect(e['event.action']).toBe('user_logout');
        expect(e['event.category']).toStrictEqual(['authentication']);
        // logout outcome is 'unknown' — the session teardown is in progress when audited.
        expect(e['event.outcome']).toBe('unknown');
        // fieldDefaults: auth events carry no event.type — default supplies ['access'].
        expect(e['event.type']).toStrictEqual(['access']);

        // User who logged out.
        expect(e['user.name']).toBeDefined();
        expect(e['user.id']).toBeDefined();

        // Auth provider — not renamed, stays as kibana.authentication_provider.
        expect(e['kibana.authentication_provider']).toBeDefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.authentication_type → authentication.type.
        expect(e['authentication.type']).toBeDefined();
        expect(e['kibana.authentication_type']).toBeUndefined();

        // Kibana context.
        expect(e['kibana.space.id']).toBe('default');
        expect(e['kibana.session.id']).toBeDefined();

        // Network.
        expect(e['source.address']).toBeDefined();
        expect(e['source.ip']).toBeDefined();
        expect(e['request.id']).toBeDefined();
      }
    );
  }
);
