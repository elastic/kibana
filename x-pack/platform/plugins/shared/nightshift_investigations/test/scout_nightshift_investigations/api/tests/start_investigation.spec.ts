/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';
import { apiTest, COMMON_HEADERS } from '../fixtures';

const INVESTIGATIONS_WRITE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { agentBuilder: ['all'] }, spaces: ['*'] }],
};

const START_PATH = 'internal/nightshift/investigations';

const alertSnapshot = {
  id: 'alert-uuid-1',
  rule_id: 'rule-uuid-1',
  rule_name: 'Latency is too high',
  rule_type_id: 'apm.transaction_duration',
  rule_category: 'Latency threshold',
  reason: 'Latency is 2.5s in the last 5 minutes for service checkout',
  status: 'active',
  start: '2026-08-24T12:00:00.000Z',
  flapping: false,
};

apiTest.describe(
  'POST /internal/nightshift/investigations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('returns 400 when the request body is empty', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
      const response = await apiClient.post(START_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {},
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 for an invalid subject type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
      const response = await apiClient.post(START_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { subject: { type: 'not_a_valid_type', id: 'some-id' } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns 400 when subject.id exceeds 500 characters',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          // Context has to be valid, or this passes on the missing snapshots instead of the id.
          body: {
            subject: { type: 'alert', id: 'x'.repeat(501) },
            context: { alerts: [alertSnapshot] },
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    // Without this, every negative test above would still pass if the alert branch rejected
    // every body it was given. Which success code comes back depends on whether the workflow is
    // installed in this environment, so this asserts only that validation let the body through.
    apiTest('accepts a well-formed alert body', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
      const response = await apiClient.post(START_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          subject: { type: 'alert', id: 'alert-uuid-1' },
          context: { alerts: [alertSnapshot] },
        },
        responseType: 'json',
      });
      expect(response.statusCode).not.toBe(400);
    });

    // An alert investigation is not also a significant-event investigation. `event_uuid` is the
    // key the workflow's attach steps read, so accepting it here would quietly attach an alert's
    // findings to a significant event.
    apiTest(
      'returns 400 for an alert context carrying keys other than alerts',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            subject: { type: 'alert', id: 'alert-uuid-1' },
            context: { alerts: [alertSnapshot], event_uuid: 'sig-event-uuid-1' },
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'returns 400 for an alert subject with no alert snapshots',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { subject: { type: 'alert', id: 'alert-uuid-1' } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'returns 400 for an alert subject whose context has an empty alerts array',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { subject: { type: 'alert', id: 'alert-uuid-1' }, context: { alerts: [] } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'returns 400 when an alert snapshot is missing a required field',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const { reason, ...withoutReason } = alertSnapshot;
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            subject: { type: 'alert', id: 'alert-uuid-1' },
            context: { alerts: [withoutReason] },
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'returns 400 when more than 20 alerts are supplied',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            subject: { type: 'alert', id: 'alert-uuid-1' },
            context: {
              alerts: Array.from({ length: 21 }, (_, i) => ({
                ...alertSnapshot,
                id: `alert-uuid-${i}`,
              })),
            },
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'returns 403 for a user without agentBuilder:write',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { subject: { type: 'alert', id: 'some-id' } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
