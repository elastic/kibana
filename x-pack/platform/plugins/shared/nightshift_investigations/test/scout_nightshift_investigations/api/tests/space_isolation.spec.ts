/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { ApiClientFixture } from '@kbn/scout';
import {
  apiTest,
  COMMON_HEADERS,
  INVESTIGATIONS_WRITE_ROLE,
  seedInvestigation,
  deleteInvestigation,
} from '../fixtures';

const SPACE_ID = 'nightshift-inv-space';
const TEST_ID = 'space-scoped-investigation';
const GET_PATH = `internal/nightshift/investigations/${TEST_ID}`;
const LIST_PATH = 'internal/nightshift/investigations';

const spacePath = (path: string, spaceId?: string) => (spaceId ? `s/${spaceId}/${path}` : path);

const getInvestigation = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  spaceId?: string
) =>
  apiClient.get(spacePath(GET_PATH, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

const listInvestigations = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  spaceId?: string
) =>
  apiClient.get(spacePath(LIST_PATH, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

const updateInvestigation = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  body: Record<string, unknown>,
  spaceId?: string
) =>
  apiClient.patch(spacePath(GET_PATH, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

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
        summary: 'Space-scoped investigation.',
      });
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await deleteInvestigation(kbnClient, TEST_ID, SPACE_ID);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(SPACE_ID);
    });

    apiTest(
      'GET returns the investigation in the space it was created in',
      async ({ apiClient }) => {
        const response = await getInvestigation(apiClient, cookieHeader, SPACE_ID);
        expect(response).toHaveStatusCode(200);
        expect(response.body.investigation_id).toBe(TEST_ID);
        expect(response.body.subject).toStrictEqual({ type: 'alert', id: 'alert-space' });
        expect(response.body.summary).toBe('Space-scoped investigation.');
      }
    );

    apiTest(
      'GET in the default space does not see a space-scoped investigation',
      async ({ apiClient }) => {
        const response = await getInvestigation(apiClient, cookieHeader);
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest('LIST in the custom space includes the investigation', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader, SPACE_ID);
      expect(response).toHaveStatusCode(200);

      const ids = response.body.results.map(
        (result: { investigation_id: string }) => result.investigation_id
      );
      expect(ids).toContain(TEST_ID);
    });

    apiTest(
      'LIST in the default space does not include the investigation',
      async ({ apiClient }) => {
        const response = await listInvestigations(apiClient, cookieHeader);
        expect(response).toHaveStatusCode(200);

        const ids = response.body.results.map(
          (result: { investigation_id: string }) => result.investigation_id
        );
        expect(ids).not.toContain(TEST_ID);
      }
    );

    apiTest('PATCH updates the investigation in its space', async ({ apiClient }) => {
      const response = await updateInvestigation(
        apiClient,
        cookieHeader,
        { status: 'completed', summary: 'Finished in space.' },
        SPACE_ID
      );
      expect(response).toHaveStatusCode(200);

      const getResponse = await getInvestigation(apiClient, cookieHeader, SPACE_ID);
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.status).toBe('completed');
      expect(getResponse.body.summary).toBe('Finished in space.');
    });

    apiTest(
      'PATCH in the default space does not update a space-scoped investigation',
      async ({ apiClient }) => {
        const response = await updateInvestigation(apiClient, cookieHeader, {
          status: 'failed',
        });
        expect(response).toHaveStatusCode(404);

        const getResponse = await getInvestigation(apiClient, cookieHeader, SPACE_ID);
        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.status).toBe('running');
      }
    );
  }
);
