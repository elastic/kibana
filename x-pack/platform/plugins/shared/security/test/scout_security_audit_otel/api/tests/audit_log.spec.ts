/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, OTEL_RECEIVER_PORT, OTEL_TEST_PROJECT_ID, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  type FlatAttributes,
  getLogAttributes,
  getResourceAttributes,
  OtlpLogReceiver,
} from '../lib/otlp_log_receiver';

const KBN_XSRF = { 'kbn-xsrf': 'xxx', 'x-elastic-internal-origin': 'kibana' };
const TEST_DASHBOARD_ID = 'audit-log-otel-test-dashboard';

const receiver = new OtlpLogReceiver();

/**
 * Asserts the OTel envelope and resource-level fields that are identical across all audit events.
 * The audit appender ships a deliberately minimal resource (includeResources allowlist) carrying
 * only service.name + service.type + project.id — the auto-detected host/OS/process/env attributes
 * are excluded.
 */
const expectOtelEnvelope = (e: FlatAttributes) => {
  // OTLP envelope fields — top-level log record fields, not logRecord.attributes.
  expect(e.severityNumber).toBe(9); // SeverityNumber.INFO
  expect(e.severityText).toBe('INFO');

  // Minimal-resource contract: the resource carries EXACTLY service.name + service.type + project.id.
  // The exact-key assertion proves the detectors' host/OS/process/env attributes are all filtered
  // out. project.id arrives as a resource attribute (OTEL_RESOURCE_ATTRIBUTES=project.id=… in the
  // config, standing in for the APM global label) and is deliberately KEPT in the resource because
  // the log-delivery pipeline reads it there.
  const resource = getResourceAttributes(e);
  expect(Object.keys(resource).sort()).toStrictEqual([
    'project.id',
    'service.name',
    'service.type',
  ]);
  expect(resource['service.name']).toBe('serverless-kibana');
  expect(resource['service.type']).toBe('kibana');
  expect(resource['project.id']).toBe(OTEL_TEST_PROJECT_ID);

  // Per-record guarantees on every audit record.
  expect(e['log.type']).toBe('audit'); // AUDIT_OTEL_FIELD_DEFAULTS
  expect(e['log.logger']).toBeUndefined(); // dropped from per-record attributes
  expect(e['service.version']).toBeUndefined(); // dropped per-record (resource copy filtered too)
  // project.id is ALSO promoted onto each record (promoteResourceAttributes) — it lives in both the
  // resource (above) and the per-record attributes. getLogAttributes reads the per-record attributes
  // specifically (the merged view can't distinguish them since project.id is in both).
  expect(getLogAttributes(e)['project.id']).toBe(OTEL_TEST_PROJECT_ID);
};

apiTest.describe(
  'Audit log — OTel field shape (Serverless)',
  // Serverless-only: the audit OTel field transforms + minimal resource are gated on the serverless
  // build flavor. Traditional/stateful behavior (raw ECS through the OTel appender) is covered by
  // audit_log_traditional.spec.ts.
  { tag: [...tags.serverless.security.complete] },
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

        // Core audit fields.
        expect(e['event.action']).toBe('user_login');
        expect(e['event.outcome']).toBe('success');
        expect(e['event.category']).toStrictEqual(['authentication']);
        // fieldDefaults: auth events carry no event.type — default supplies ['access'].
        expect(e['event.type']).toStrictEqual(['access']);

        // User identity. On Serverless user.id is keyed by login name, not by profile UID.
        expect(e['user.name']).toBe(username);
        expect(e['user.id']).toBe(username);
        expect(e['user.roles']).toStrictEqual(['superuser']);

        // The realm is remapped, not dropped: user_login carries it in the record.
        expect(e['user.domain']).toBeDefined();

        // AUDIT_OTEL_FIELD_DROPS: kibana.authentication_provider and kibana.authentication_realm
        // carry fixed values on Serverless (always cloud-saml-kibana) and are dropped.
        expect(e['kibana.authentication_provider']).toBeUndefined();
        expect(e['kibana.authentication_realm']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.authentication_type → authentication.type.
        expect(e['authentication.type']).toBe('basic');
        expect(e['kibana.authentication_type']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.space_id → kibana.space.id — not asserted here:
        // space isn't meaningful at authentication time, so login events intentionally omit it.
        expect(e['kibana.space_id']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.session_id → kibana.session.id.
        expect(e['kibana.session.id']).toBeDefined();
        expect(e['kibana.session_id']).toBeUndefined();

        // AUDIT_OTEL_FIELD_DROPS: kibana.lookup_realm is dropped (fixed value on Serverless).
        expect(e['kibana.lookup.realm']).toBeUndefined();
        expect(e['kibana.lookup_realm']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: client.ip → source.address + source.ip.
        expect(e['source.address']).toBeDefined();
        expect(e['source.ip']).toBeDefined();
        expect(e['client.ip']).toBeUndefined();

        // Header rename: http.request.headers.x-forwarded-for → network.forwarded_ip.
        expect(e['network.forwarded_ip']).toBeDefined();
        expect(e['http.request.headers.x-forwarded-for']).toBeUndefined();
        expect(e['http.request.header.x-forwarded-for']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: trace.id → http.request.id.
        expect(e['http.request.id']).toBeDefined();
        expect(e['request.id']).toBeUndefined();
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

        // Auth context — provider dropped on Serverless; authentication.type still present.
        expect(e['kibana.authentication_provider']).toBeUndefined();
        expect(e['authentication.type']).toBe('basic');

        // Error details.
        expect(e['error.code']).toBe('ResponseError');
        expect(e['error.message']).toMatch(/security_exception/);

        // Network.
        expect(e['source.address']).toBeDefined();
        expect(e['source.ip']).toBeDefined();
        expect(e['http.request.id']).toBeDefined();
      }
    );

    apiTest(
      'http_request: http.request.id present (not trace.id), HTTP method uppercase',
      async ({ apiClient, samlAuth }) => {
        const snap = receiver.snapshot();
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        await apiClient.get('api/status', {
          headers: { ...cookieHeader },
          responseType: 'json',
        });

        const e = await snap.waitForLogRecord(
          (attrs) =>
            attrs['event.action'] === 'http_request' &&
            typeof attrs['url.original'] === 'string' &&
            (attrs['url.original'] as string).includes('/api/status')
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

        // Request URL: fieldAdditions builds url.original from the split url.* fields, which are
        // then dropped by AUDIT_OTEL_FIELD_DROPS — the ingest pipeline reparses url.original.
        expect(e['url.original']).toContain('/api/status');
        expect(e['url.path']).toBeUndefined();
        expect(e['url.domain']).toBeUndefined();
        expect(e['url.port']).toBeUndefined();
        expect(e['url.scheme']).toBeUndefined();

        // http.request.method must be uppercase per OTel semantic conventions.
        expect(e['http.request.method']).toBe('GET');

        // Authenticated user.
        expect(e['user.name']).toBeDefined();
        expect(e['user.id']).toBe(e['user.name']);
        expect(e['user.domain']).toBeDefined(); // authentication realm, added on Serverless only
        expect(Array.isArray(e['user.roles'])).toBe(true);

        // Kibana context.
        expect(e['kibana.space.id']).toBe('default');
        expect(e['kibana.session.id']).toBeDefined();

        // Network.
        expect(e['source.address']).toBe('127.0.0.1');
        expect(e['source.ip']).toBe('127.0.0.1');

        // AUDIT_OTEL_FIELD_RENAMES: trace.id → http.request.id (avoids OTel TraceId collision).
        expect(e['http.request.id']).toBeDefined();
        expect(e['request.id']).toBeUndefined();
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
        expect(e['user.id']).toBe(e['user.name']);
        expect(e['user.domain']).toBeDefined(); // authentication realm, added on Serverless only
        expect(Array.isArray(e['user.roles'])).toBe(true);

        // AUDIT_OTEL_FIELD_RENAMES: kibana.space_id → kibana.space.id.
        expect(e['kibana.space.id']).toBe('default');
        expect(e['kibana.space_id']).toBeUndefined();

        // Kibana context.
        expect(e['kibana.session.id']).toBeDefined();

        // Network.
        expect(e['source.address']).toBe('127.0.0.1');
        expect(e['source.ip']).toBe('127.0.0.1');
        expect(e['http.request.id']).toBeDefined();
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
        expect(e['user.id']).toBe(e['user.name']);

        // Auth provider — dropped on Serverless (fixed value).
        expect(e['kibana.authentication_provider']).toBeUndefined();

        // AUDIT_OTEL_FIELD_RENAMES: kibana.authentication_type → authentication.type.
        expect(e['authentication.type']).toBeDefined();
        expect(e['kibana.authentication_type']).toBeUndefined();

        // Kibana context.
        expect(e['kibana.space.id']).toBe('default');
        expect(e['kibana.session.id']).toBeDefined();

        // Network.
        expect(e['source.address']).toBeDefined();
        expect(e['source.ip']).toBeDefined();
        expect(e['http.request.id']).toBeDefined();
      }
    );
  }
);
