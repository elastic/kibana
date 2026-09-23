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
  INVESTIGATIONS_WRITE_ROLE,
  getInvestigation,
  listInvestigations,
  updateInvestigation,
  seedInvestigation,
  deleteInvestigation,
  uniqueId,
  seedTimeWindow,
} from '../fixtures';

const SPACE_ID = uniqueId('nightshift-inv-space');
const TEST_ID = uniqueId('space-scoped-investigation');
const CONTROL_ID = uniqueId('space-isolation-default');
const times = seedTimeWindow(1);

apiTest.describe(
  'investigations are isolated per space',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.spaces.create({ id: SPACE_ID, name: SPACE_ID });
      ({ cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE));
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await seedInvestigation(kbnClient, {
        id: TEST_ID,
        space: SPACE_ID,
        status: 'running',
        subject_type: 'alert',
        subject_id: 'alert-space',
        trigger_type: 'automatic',
        created_at: times.iso({ day: 0, hour: 10 }),
        summary: 'Space-scoped investigation.',
      });
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await deleteInvestigation(kbnClient, TEST_ID, SPACE_ID);
      await deleteInvestigation(kbnClient, CONTROL_ID);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(SPACE_ID);
    });

    apiTest(
      'GET returns the investigation in the space it was created in',
      async ({ apiClient }) => {
        const response = await getInvestigation(apiClient, cookieHeader, TEST_ID, {
          spaceId: SPACE_ID,
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.investigation_id).toBe(TEST_ID);
        expect(response.body.subject).toStrictEqual({ type: 'alert', id: 'alert-space' });
        expect(response.body.summary).toBe('Space-scoped investigation.');
      }
    );

    apiTest(
      'GET in the default space does not see a space-scoped investigation',
      async ({ apiClient }) => {
        const response = await getInvestigation(apiClient, cookieHeader, TEST_ID);
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest('LIST in the custom space includes the investigation', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader, {
        spaceId: SPACE_ID,
        query: times.createdRange,
      });
      expect(response).toHaveStatusCode(200);

      const ids = response.body.results.map(
        (result: { investigation_id: string }) => result.investigation_id
      );
      expect(ids).toContain(TEST_ID);
    });

    apiTest(
      'LIST in the default space does not include the investigation',
      async ({ apiClient, kbnClient }) => {
        await seedInvestigation(kbnClient, {
          id: CONTROL_ID,
          status: 'running',
          subject_type: 'alert',
          subject_id: 'alert-default-space',
          trigger_type: 'automatic',
          created_at: times.iso({ day: 0, hour: 10 }),
        });

        const response = await listInvestigations(apiClient, cookieHeader, {
          query: times.createdRange,
        });
        expect(response).toHaveStatusCode(200);

        const ids = response.body.results.map(
          (result: { investigation_id: string }) => result.investigation_id
        );
        expect(ids).toContain(CONTROL_ID);
        expect(ids).not.toContain(TEST_ID);
      }
    );

    apiTest('PATCH updates the investigation in its space', async ({ apiClient }) => {
      const response = await updateInvestigation(
        apiClient,
        cookieHeader,
        TEST_ID,
        { status: 'completed', summary: 'Finished in space.' },
        { spaceId: SPACE_ID }
      );
      expect(response).toHaveStatusCode(200);

      const getResponse = await getInvestigation(apiClient, cookieHeader, TEST_ID, {
        spaceId: SPACE_ID,
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.status).toBe('completed');
      expect(getResponse.body.summary).toBe('Finished in space.');
    });

    apiTest(
      'PATCH in the default space does not update a space-scoped investigation',
      async ({ apiClient }) => {
        const response = await updateInvestigation(apiClient, cookieHeader, TEST_ID, {
          status: 'failed',
        });
        expect(response).toHaveStatusCode(404);

        const getResponse = await getInvestigation(apiClient, cookieHeader, TEST_ID, {
          spaceId: SPACE_ID,
        });
        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.status).toBe('running');
      }
    );
  }
);
