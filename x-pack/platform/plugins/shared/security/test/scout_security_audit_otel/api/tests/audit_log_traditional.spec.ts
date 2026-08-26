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

const receiver = new OtlpLogReceiver();

/**
 * Asserts the OTel envelope + resource on a non-Serverless (traditional) build. The audit OTel field
 * transforms and the minimal resource are gated on the Serverless build flavor, so on traditional
 * the OTel appender passes through unchanged: a full (auto-detected) resource and raw ECS field
 * names in the log-record attributes.
 */
const expectTraditionalEnvelope = (e: FlatAttributes) => {
  expect(e.severityNumber).toBe(9); // SeverityNumber.INFO
  expect(e.severityText).toBe('INFO');

  // Full resource (not the Serverless minimal one): the resource detectors run, so
  // telemetry.sdk.language is present and service.name is NOT the Serverless override.
  const resource = getResourceAttributes(e);
  expect(resource['telemetry.sdk.language']).toBe('nodejs');
  expect(resource['service.name']).not.toBe('serverless-kibana');
  // project.id stays in the resource on traditional — promoteResourceAttributes is not applied off
  // Serverless, so it is NOT copied to per-record attributes (contrast with the Serverless spec,
  // where it appears in both).
  expect(resource['project.id']).toBe(OTEL_TEST_PROJECT_ID);
  expect(getLogAttributes(e)['project.id']).toBeUndefined();

  // Serverless-only per-record transforms are not applied on traditional.
  expect(e['log.type']).toBeUndefined(); // fieldDefaults not injected
  expect(e['log.logger']).toBe('plugins.security.audit.ecs'); // not dropped
  expect(getLogAttributes(e)['service.version']).toBeDefined(); // not dropped per-record
};

apiTest.describe(
  'Audit log — OTel appender on traditional (no Serverless transforms)',
  // Traditional-only: verifies the Serverless field transforms are NOT applied off Serverless.
  // The transformed Serverless shape is covered by audit_log.spec.ts.
  { tag: [...tags.stateful.classic] },
  () => {
    apiTest.beforeAll(async () => {
      await receiver.start(OTEL_RECEIVER_PORT);
    });

    apiTest.afterAll(async () => {
      await receiver.stop();
    });

    apiTest(
      'user_login: raw ECS field names, no Serverless renames or drops',
      async ({ apiClient, samlAuth }) => {
        const snap = receiver.snapshot();

        // A real SAML login emits a user_login audit event; the status call forces the login to
        // complete before we poll the receiver.
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        await apiClient.get('api/status', { headers: { ...cookieHeader }, responseType: 'json' });

        const e = await snap.waitForLogRecord(
          (attrs) => attrs['event.action'] === 'user_login' && attrs['event.outcome'] === 'success'
        );

        expectTraditionalEnvelope(e);
        expect(e['event.action']).toBe('user_login');

        // Renames NOT applied — raw ECS keys are present, Serverless targets are absent.
        expect(e['kibana.authentication_type']).toBeDefined();
        expect(e['authentication.type']).toBeUndefined();
        expect(e['kibana.session_id']).toBeDefined();
        expect(e['kibana.session.id']).toBeUndefined();
        expect(e['trace.id']).toBeDefined();
        expect(e['http.request.id']).toBeUndefined();
        expect(e['request.id']).toBeUndefined();
        expect(e['client.ip']).toBeDefined();
        expect(e['source.address']).toBeUndefined();
        expect(e['source.ip']).toBeUndefined();

        // Drops NOT applied — the auth realm/provider fields are retained.
        expect(e['kibana.authentication_provider']).toBeDefined();

        // event.type default NOT applied (user_login carries no ECS event.type).
        expect(e['event.type']).toBeUndefined();
      }
    );

    apiTest(
      'http_request: lowercase method, split url.* fields, no url.original',
      async ({ apiClient, samlAuth }) => {
        const snap = receiver.snapshot();
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        await apiClient.get('api/status', {
          headers: { ...cookieHeader, 'X-Forwarded-For': '1.2.3.4' },
          responseType: 'json',
        });

        const e = await snap.waitForLogRecord(
          (attrs) =>
            attrs['event.action'] === 'http_request' &&
            // Pin to our request via the X-Forwarded-For we set — internal status checks from the
            // auth flow also hit /api/status but without it, and could otherwise be matched first.
            attrs['http.request.headers.x-forwarded-for'] === '1.2.3.4'
        );

        expectTraditionalEnvelope(e);
        expect(e['event.action']).toBe('http_request');

        // fieldUppercase NOT applied — HTTP method keeps Kibana's lowercase route casing.
        expect(e['http.request.method']).toBe('get');

        // fieldAdditions NOT applied — the split url.* fields are emitted, url.original is not built.
        expect(e['url.path']).toBe('/api/status');
        expect(e['url.original']).toBeUndefined();

        // Renames NOT applied — raw ECS keys present, Serverless targets absent.
        expect(e['kibana.space_id']).toBeDefined();
        expect(e['kibana.space.id']).toBeUndefined();
        expect(e['trace.id']).toBeDefined();
        expect(e['http.request.id']).toBeUndefined();
        expect(e['client.ip']).toBeDefined();
        expect(e['source.address']).toBeUndefined();
        expect(e['http.request.headers.x-forwarded-for']).toBeDefined();
        expect(e['network.forwarded_ip']).toBeUndefined();
      }
    );
  }
);
