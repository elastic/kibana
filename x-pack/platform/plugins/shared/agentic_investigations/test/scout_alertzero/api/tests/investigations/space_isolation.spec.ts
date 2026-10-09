/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  INTERNAL_HEADERS,
  INVESTIGATION_BY_ID_PATH,
  INVESTIGATIONS_PATH,
  cleanupSubjects,
  deleteConversations,
  seedInvestigation,
  seedSubject,
  spaceUrl,
} from '../../fixtures';

const RUN = `scout-space-${Date.now()}`;
const SPACE_ID = `inv-query-space-${Date.now()}`;

apiTest.describe(
  'Investigations are isolated per Space',
  { tag: [...tags.local.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let spaceInvestigationId: string;

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient, esClient }) => {
      await apiServices.spaces.create({ id: SPACE_ID, name: SPACE_ID });
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      spaceInvestigationId = await seedInvestigation(apiClient, cookieHeader, {
        title: `${RUN} space investigation`,
        metadata: { status: 'open', severity: 'high', summary: `${RUN} summary` },
        impactEntities: [{ id: `${RUN}-entity` }],
        spaceId: SPACE_ID,
      });
      await seedSubject(esClient, {
        conversationId: spaceInvestigationId,
        type: 'alert',
        id: `${RUN}-alert`,
        spaceId: SPACE_ID,
      });
    });

    apiTest.afterAll(async ({ apiServices, apiClient, esClient }) => {
      await cleanupSubjects(esClient, [spaceInvestigationId]);
      await deleteConversations(apiClient, [spaceInvestigationId], cookieHeader, SPACE_ID);
      await apiServices.spaces.delete(SPACE_ID);
    });

    apiTest(
      'lists the investigation in its own Space by entity and by subject',
      async ({ apiClient }) => {
        for (const query of [`entity=${RUN}-entity`, `subject_id=${RUN}-alert`]) {
          const response = await apiClient.get(
            spaceUrl(`${INVESTIGATIONS_PATH}?${query}`, SPACE_ID),
            {
              headers: { ...INTERNAL_HEADERS, ...cookieHeader },
              responseType: 'json',
            }
          );

          expect(response).toHaveStatusCode(200);
          expect(response.body.results.map(({ id }: { id: string }) => id)).toStrictEqual([
            spaceInvestigationId,
          ]);
        }
      }
    );

    apiTest(
      'does not list it in the default Space, by entity, subject, or text',
      async ({ apiClient }) => {
        for (const query of [`entity=${RUN}-entity`, `subject_id=${RUN}-alert`, `query=${RUN}`]) {
          const response = await apiClient.get(`${INVESTIGATIONS_PATH}?${query}`, {
            headers: { ...INTERNAL_HEADERS, ...cookieHeader },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          expect(response.body.results).toStrictEqual([]);
        }
      }
    );

    apiTest('returns 404 for its id in the default Space', async ({ apiClient }) => {
      const response = await apiClient.get(INVESTIGATION_BY_ID_PATH(spaceInvestigationId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(404);
    });
  }
);
