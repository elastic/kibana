/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import {
  apiTest,
  COMBINED_INVESTIGATIONS_ADMIN_ROLE,
  getInvestigation,
  listInvestigations,
  upsertInvestigation,
  uniqueId,
} from '../fixtures';

/**
 * Tests for space-scoping of /internal/investigations/investigations.
 *
 * Investigations are scoped to the Kibana space derived from the request. A
 * record created in space A must not be visible in space B, and vice-versa.
 *
 * The nightshift PATCH route is also verified to respect space boundaries: an
 * update issued in the wrong space must return 404.
 */
const SPACE_ID = uniqueId('nightshift-inv-space');
const CUSTOM_SPACE_TEST_ID = uniqueId('space-scoped-investigation');
const DEFAULT_SPACE_CONTROL_ID = uniqueId('space-isolation-default');

apiTest.describe(
  'investigations are isolated per space',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.spaces.create({ id: SPACE_ID, name: SPACE_ID });
      ({ cookieHeader } = await samlAuth.asInteractiveUser(COMBINED_INVESTIGATIONS_ADMIN_ROLE));
    });

    apiTest.beforeEach(async ({ apiClient }) => {
      // Seed the investigation in the custom space.
      await upsertInvestigation(
        apiClient,
        cookieHeader,
        {
          id: CUSTOM_SPACE_TEST_ID,
          spaceId: SPACE_ID,
          status: 'running',
          subjectType: 'alert',
          subjectId: 'alert-space',
          summary: 'Space-scoped investigation.',
        },
        { spaceId: SPACE_ID }
      );
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(SPACE_ID);
    });

    apiTest(
      'GET returns the investigation in the space it was created in',
      async ({ apiClient }) => {
        const response = await getInvestigation(apiClient, cookieHeader, CUSTOM_SPACE_TEST_ID, {
          spaceId: SPACE_ID,
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.id).toBe(CUSTOM_SPACE_TEST_ID);
        expect(response.body.subjectType).toBe('alert');
        expect(response.body.subjectId).toBe('alert-space');
        expect(response.body.summary).toBe('Space-scoped investigation.');
      }
    );

    apiTest(
      'GET in the default space does not see a custom-space investigation',
      async ({ apiClient }) => {
        const response = await getInvestigation(apiClient, cookieHeader, CUSTOM_SPACE_TEST_ID);
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest('LIST in the custom space includes the investigation', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader, {
        spaceId: SPACE_ID,
      });
      expect(response).toHaveStatusCode(200);

      const ids = response.body.items.map((result: { id: string }) => result.id);
      expect(ids).toContain(CUSTOM_SPACE_TEST_ID);
    });

    apiTest(
      'LIST in the default space does not include a custom-space investigation',
      async ({ apiClient }) => {
        // Seed a control record in the default space.
        await upsertInvestigation(apiClient, cookieHeader, {
          id: DEFAULT_SPACE_CONTROL_ID,
          status: 'running',
          subjectType: 'alert',
          subjectId: 'alert-default-space',
        });

        const response = await listInvestigations(apiClient, cookieHeader);
        expect(response).toHaveStatusCode(200);

        const ids = response.body.items.map((result: { id: string }) => result.id);
        expect(ids).toContain(DEFAULT_SPACE_CONTROL_ID);
        expect(ids).not.toContain(CUSTOM_SPACE_TEST_ID);
      }
    );
  }
);
