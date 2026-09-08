/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { significantEventsApiTest as apiTest, getStreamsUsers } from '../fixtures';
import { COMMON_API_HEADERS } from '../fixtures/constants';

const AVAILABILITY_PATH = 'internal/significant_events/availability';
const CONTEXT_MANAGE_PATH = 'internal/streams/_prompts';
const DETECTION_MANAGE_PATH = 'internal/streams/_significant_events/scheduled_discovery/settings';

apiTest.describe(
  'Nightshift privilege isolation',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'nightshift all can call availability and both engine manage routes',
      async ({ apiClient, samlAuth, config }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          getStreamsUsers(config).nightshiftAll
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
      }
    );

    apiTest(
      'context engine all can manage context but not detection',
      async ({ apiClient, samlAuth, config }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          getStreamsUsers(config).contextEngineAll
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
      }
    );

    apiTest(
      'detection engine all can manage detection but not context',
      async ({ apiClient, samlAuth, config }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          getStreamsUsers(config).detectionEngineAll
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
      }
    );

    apiTest(
      'streams only is denied on availability and both engine manage routes',
      async ({ apiClient, samlAuth, config }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          getStreamsUsers(config).streamsOnly
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
      }
    );
  }
);
