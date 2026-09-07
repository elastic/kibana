/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { significantEventsApiTest as apiTest, getSignificantEventsUsers } from '../fixtures';
import { COMMON_API_HEADERS } from '../fixtures/constants';

const AVAILABILITY_PATH = 'internal/significant_events/availability';
const CONTEXT_MANAGE_PATH = 'internal/streams/_prompts';
const DETECTION_MANAGE_PATH = 'internal/streams/_significant_events/scheduled_discovery/settings';
const INVESTIGATION_READ_PATH = 'internal/significant_events/investigations/_status';

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
  }
);
