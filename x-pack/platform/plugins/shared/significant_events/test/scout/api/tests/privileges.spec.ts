/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { significantEventsApiTest as apiTest, getSignificantEventsUsers } from '../fixtures';
import { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from '../fixtures/constants';

// Availability: any Nightshift engine read.
const AVAILABILITY_PATH = 'internal/significant_events/availability';
// Context Engine manage (prompts).
const CONTEXT_MANAGE_PATH = 'internal/streams/_prompts';
// Detection Engine manage (scheduled discovery).
const DETECTION_MANAGE_PATH = 'internal/streams/_significant_events/scheduled_discovery/settings';
// Investigation Engine read.
const INVESTIGATION_READ_PATH = 'internal/significant_events/investigations/_status';
// Detection or Investigation read.
const EVENTS_PATH = 'internal/significant_events/events';
// Public KI queries: read is Context or Detection; writes are Context manage.
const PUBLIC_QUERIES_PATH = 'api/streams/logs.does-not-need-to-exist/queries';
const CONSUME_PATH = 'internal/significant_events/run_quotas/_consume';
const PAUSE_PATH = 'internal/significant_events/maintenance/_pause';
const SLACK_CONNECT_PATH = 'internal/significant_events/apps/slack/connect';
const ATTACH_PATH = 'internal/significant_events/events/evt-does-not-need-to-exist/investigations';

const expectAuthorized = (statusCode: number) => {
  expect([200, 400, 404, 409, 503]).toContain(statusCode);
};

apiTest.describe(
  'Nightshift privilege isolation',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'nightshift all can call availability and each engine route',
      async ({ apiClient, samlAuth, config }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          getSignificantEventsUsers(config).nightshiftAll
        );
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        expect(
          await apiClient.get(AVAILABILITY_PATH, { headers, responseType: 'json' })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.get(CONTEXT_MANAGE_PATH, { headers, responseType: 'json' })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.put(DETECTION_MANAGE_PATH, {
            headers,
            body: { scheduledDiscovery: {} },
            responseType: 'json',
          })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.post(INVESTIGATION_READ_PATH, {
            headers,
            body: { workflow_execution_ids: [] },
            responseType: 'json',
          })
        ).toHaveStatusCode(200);
      }
    );

    apiTest(
      'context engine all can manage context but not detection or investigation',
      async ({ apiClient, samlAuth, config }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          getSignificantEventsUsers(config).contextEngineAll
        );
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        expect(
          await apiClient.get(AVAILABILITY_PATH, { headers, responseType: 'json' })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.get(CONTEXT_MANAGE_PATH, { headers, responseType: 'json' })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.put(DETECTION_MANAGE_PATH, {
            headers,
            body: { scheduledDiscovery: {} },
            responseType: 'json',
          })
        ).toHaveStatusCode(403);
        expect(
          await apiClient.post(INVESTIGATION_READ_PATH, {
            headers,
            body: { workflow_execution_ids: [] },
            responseType: 'json',
          })
        ).toHaveStatusCode(403);
      }
    );

    apiTest(
      'detection engine all can manage detection but not context or investigation',
      async ({ apiClient, samlAuth, config }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          getSignificantEventsUsers(config).detectionEngineAll
        );
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        expect(
          await apiClient.get(AVAILABILITY_PATH, { headers, responseType: 'json' })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.put(DETECTION_MANAGE_PATH, {
            headers,
            body: { scheduledDiscovery: {} },
            responseType: 'json',
          })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.get(CONTEXT_MANAGE_PATH, { headers, responseType: 'json' })
        ).toHaveStatusCode(403);
        expect(
          await apiClient.post(INVESTIGATION_READ_PATH, {
            headers,
            body: { workflow_execution_ids: [] },
            responseType: 'json',
          })
        ).toHaveStatusCode(403);
      }
    );

    apiTest(
      'investigation engine all can read investigations but not context or detection',
      async ({ apiClient, samlAuth, config }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          getSignificantEventsUsers(config).investigationEngineAll
        );
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        expect(
          await apiClient.get(AVAILABILITY_PATH, { headers, responseType: 'json' })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.post(INVESTIGATION_READ_PATH, {
            headers,
            body: { workflow_execution_ids: [] },
            responseType: 'json',
          })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.get(CONTEXT_MANAGE_PATH, { headers, responseType: 'json' })
        ).toHaveStatusCode(403);
        expect(
          await apiClient.put(DETECTION_MANAGE_PATH, {
            headers,
            body: { scheduledDiscovery: {} },
            responseType: 'json',
          })
        ).toHaveStatusCode(403);
      }
    );

    apiTest(
      'streams only is denied on availability and every engine route',
      async ({ apiClient, samlAuth, config }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          getSignificantEventsUsers(config).streamsOnly
        );
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        expect(
          await apiClient.get(AVAILABILITY_PATH, { headers, responseType: 'json' })
        ).toHaveStatusCode(403);
        expect(
          await apiClient.get(CONTEXT_MANAGE_PATH, { headers, responseType: 'json' })
        ).toHaveStatusCode(403);
        expect(
          await apiClient.put(DETECTION_MANAGE_PATH, {
            headers,
            body: { scheduledDiscovery: {} },
            responseType: 'json',
          })
        ).toHaveStatusCode(403);
        expect(
          await apiClient.post(INVESTIGATION_READ_PATH, {
            headers,
            body: { workflow_execution_ids: [] },
            responseType: 'json',
          })
        ).toHaveStatusCode(403);
      }
    );

    apiTest(
      'event list is readable by Detection or Investigation, not Context',
      async ({ apiClient, samlAuth, config }) => {
        const users = getSignificantEventsUsers(config);

        expectAuthorized(
          (
            await apiClient.get(EVENTS_PATH, {
              headers: {
                ...COMMON_API_HEADERS,
                ...(await samlAuth.asInteractiveUser(users.detectionEngineRead)).cookieHeader,
              },
              responseType: 'json',
            })
          ).statusCode
        );
        expectAuthorized(
          (
            await apiClient.get(EVENTS_PATH, {
              headers: {
                ...COMMON_API_HEADERS,
                ...(await samlAuth.asInteractiveUser(users.investigationEngineRead)).cookieHeader,
              },
              responseType: 'json',
            })
          ).statusCode
        );
        expect(
          await apiClient.get(EVENTS_PATH, {
            headers: {
              ...COMMON_API_HEADERS,
              ...(await samlAuth.asInteractiveUser(users.contextEngineRead)).cookieHeader,
            },
            responseType: 'json',
          })
        ).toHaveStatusCode(403);
      }
    );

    apiTest(
      'public query writes require Context manage; reads allow Context or Detection',
      async ({ apiClient, samlAuth, config }) => {
        const users = getSignificantEventsUsers(config);
        const publicGet = async (role: (typeof users)[keyof typeof users]) =>
          apiClient.get(PUBLIC_QUERIES_PATH, {
            headers: {
              ...PUBLIC_API_HEADERS,
              ...(await samlAuth.asInteractiveUser(role)).cookieHeader,
            },
            responseType: 'json',
          });
        const publicPut = async (role: (typeof users)[keyof typeof users]) =>
          apiClient.put(`${PUBLIC_QUERIES_PATH}/q-1`, {
            headers: {
              ...PUBLIC_API_HEADERS,
              ...(await samlAuth.asInteractiveUser(role)).cookieHeader,
            },
            body: {
              title: 'q',
              esql: { query: 'FROM logs* | LIMIT 1' },
            },
            responseType: 'json',
          });

        expectAuthorized((await publicGet(users.contextEngineRead)).statusCode);
        expectAuthorized((await publicGet(users.detectionEngineRead)).statusCode);
        expect(await publicGet(users.investigationEngineRead)).toHaveStatusCode(403);
        expectAuthorized((await publicPut(users.contextEngineAll)).statusCode);
        expect(await publicPut(users.detectionEngineAll)).toHaveStatusCode(403);
      }
    );

    apiTest(
      'run quota consume is owned by the engine that matches the group',
      async ({ apiClient, samlAuth, config }) => {
        const users = getSignificantEventsUsers(config);
        const consume = async (
          role: (typeof users)[keyof typeof users],
          body: { group: string; critical?: boolean }
        ) =>
          apiClient.post(CONSUME_PATH, {
            headers: {
              ...COMMON_API_HEADERS,
              ...(await samlAuth.asInteractiveUser(role)).cookieHeader,
            },
            body,
            responseType: 'json',
          });

        expectAuthorized(
          (await consume(users.detectionEngineAll, { group: 'detection' })).statusCode
        );
        expectAuthorized(
          (await consume(users.contextEngineAll, { group: 'ki_extraction' })).statusCode
        );
        expectAuthorized(
          (await consume(users.investigationEngineAll, { group: 'investigation', critical: false }))
            .statusCode
        );
        expect(
          await consume(users.detectionEngineAll, { group: 'ki_extraction' })
        ).toHaveStatusCode(403);
        expect(await consume(users.contextEngineAll, { group: 'detection' })).toHaveStatusCode(403);
      }
    );

    apiTest(
      'pause and Slack stay off Investigation / Nightshift-only roles',
      async ({ apiClient, samlAuth, config }) => {
        const users = getSignificantEventsUsers(config);
        const investigationHeaders = {
          ...COMMON_API_HEADERS,
          ...(await samlAuth.asInteractiveUser(users.investigationEngineAll)).cookieHeader,
        };
        const nightshiftHeaders = {
          ...COMMON_API_HEADERS,
          ...(await samlAuth.asInteractiveUser(users.nightshiftAll)).cookieHeader,
        };

        expect(
          await apiClient.post(PAUSE_PATH, {
            headers: investigationHeaders,
            body: {},
            responseType: 'json',
          })
        ).toHaveStatusCode(403);
        expect(
          await apiClient.post(SLACK_CONNECT_PATH, {
            headers: nightshiftHeaders,
            body: {},
            responseType: 'json',
          })
        ).toHaveStatusCode(403);
        expect(
          await apiClient.post(ATTACH_PATH, {
            headers: {
              ...COMMON_API_HEADERS,
              ...(await samlAuth.asInteractiveUser(users.contextEngineAll)).cookieHeader,
            },
            body: {
              workflow_execution_id: 'exec-1',
              started_at: '2026-01-01T00:00:00.000Z',
              completed_at: '2026-01-01T00:01:00.000Z',
            },
            responseType: 'json',
          })
        ).toHaveStatusCode(403);
        expect(
          await apiClient.post(ATTACH_PATH, {
            headers: investigationHeaders,
            body: {
              workflow_execution_id: 'exec-1',
              started_at: '2026-01-01T00:00:00.000Z',
              completed_at: '2026-01-01T00:01:00.000Z',
              trigger_feedback: [
                {
                  field: 'severity',
                  from: '40-medium',
                  to: '80-critical',
                  reason: 'The outage is broader than the original medium rating.',
                  evidence: [{ description: 'Error rate stayed above 40% for 20 minutes.' }],
                },
              ],
            },
            responseType: 'json',
          })
        ).toHaveStatusCode(403);
      }
    );
  }
);
