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
  IMPACT_PATH,
  INTERNAL_HEADERS,
  INVESTIGATION_BY_ID_PATH,
  INVESTIGATIONS_PATH,
  INVESTIGATIONS_PRIVILEGES_PATH,
  INVESTIGATIONS_READ_ROLE,
  INVESTIGATIONS_SECTION_COUNTS_PATH,
  NO_INVESTIGATIONS_ROLE,
  deleteConversations,
  getSectionCounts,
  sectionCountsOf,
  seedInvestigation,
  type SectionCountsBody,
} from '../../fixtures';

// The `_privileges` response shape; spelled out because the Scout project cannot import plugin code.
interface InvestigationsPrivilegesResponse {
  investigations: { read: boolean; manage: boolean };
}

const RUN = `scout-access-${Date.now()}`;

apiTest.describe(
  'Investigation query API access control',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminCookieHeader: Record<string, string>;
    let investigationId: string;
    let privateInvestigationId: string;

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
      investigationId = await seedInvestigation(apiClient, adminCookieHeader, {
        title: `${RUN} investigation`,
        metadata: { status: 'open', severity: 'medium', summary: `${RUN} summary` },
        impactEntities: [{ id: `${RUN}-entity` }],
      });
      privateInvestigationId = await seedInvestigation(apiClient, adminCookieHeader, {
        title: `${RUN} private investigation`,
        metadata: { status: 'open', severity: 'high', summary: `${RUN} private summary` },
        impactEntities: [{ id: `${RUN}-private-entity` }],
        accessMode: 'private',
      });
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await deleteConversations(
        apiClient,
        [investigationId, privateInvestigationId],
        adminCookieHeader
      );
    });

    apiTest(
      'returns 403 on every read for a user without an investigations privilege',
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NO_INVESTIGATIONS_ROLE);
        const headers = { ...INTERNAL_HEADERS, ...cookieHeader };

        for (const path of [
          INVESTIGATION_BY_ID_PATH(investigationId),
          INVESTIGATIONS_PATH,
          INVESTIGATIONS_SECTION_COUNTS_PATH,
        ]) {
          const response = await apiClient.get(path, { headers, responseType: 'json' });
          expect(response).toHaveStatusCode(403);
        }
      }
    );

    apiTest(
      'lets a user with only the read privilege get, list, and count investigations',
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_READ_ROLE);
        const headers = { ...INTERNAL_HEADERS, ...cookieHeader };

        const get = await apiClient.get(INVESTIGATION_BY_ID_PATH(investigationId), {
          headers,
          responseType: 'json',
        });
        expect(get).toHaveStatusCode(200);
        expect(get.body).toMatchObject({
          id: investigationId,
          impact: { entities: [{ id: `${RUN}-entity` }] },
        });

        const list = await apiClient.get(`${INVESTIGATIONS_PATH}?entity=${RUN}-entity`, {
          headers,
          responseType: 'json',
        });
        expect(list).toHaveStatusCode(200);
        expect(list.body.results.map(({ id }: { id: string }) => id)).toStrictEqual([
          investigationId,
        ]);

        const counts = await getSectionCounts(apiClient, cookieHeader, { query: RUN });
        expect(counts).toHaveStatusCode(200);
        expect(sectionCountsOf(counts.body as SectionCountsBody, 'matching')).toStrictEqual({
          critical: 0,
          high: 0,
          medium: 1,
          low: 0,
          none: 0,
          closed: 0,
        });
      }
    );

    apiTest(
      "hides another user's private investigation from list, counts, and get",
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_READ_ROLE);
        const headers = { ...INTERNAL_HEADERS, ...cookieHeader };

        // The side index matches the entity; the access-checked conversation read drops it.
        const byEntity = await apiClient.get(
          `${INVESTIGATIONS_PATH}?entity=${RUN}-private-entity`,
          { headers, responseType: 'json' }
        );
        expect(byEntity).toHaveStatusCode(200);
        expect(byEntity.body.results).toStrictEqual([]);

        // Conversation search path.
        const byText = await apiClient.get(`${INVESTIGATIONS_PATH}?query=${RUN}`, {
          headers,
          responseType: 'json',
        });
        expect(byText).toHaveStatusCode(200);
        expect(byText.body.results.map(({ id }: { id: string }) => id)).toStrictEqual([
          investigationId,
        ]);

        // The counts copy Agent Builder's read filter: the private high one is not counted.
        const counts = await getSectionCounts(apiClient, cookieHeader, { query: RUN });
        expect(counts).toHaveStatusCode(200);
        expect(sectionCountsOf(counts.body as SectionCountsBody, 'matching')).toMatchObject({
          medium: 1,
          high: 0,
        });

        const get = await apiClient.get(INVESTIGATION_BY_ID_PATH(privateInvestigationId), {
          headers,
          responseType: 'json',
        });
        expect([403, 404]).toContain(get.statusCode);

        // The owner still sees it.
        const owner = await apiClient.get(`${INVESTIGATIONS_PATH}?entity=${RUN}-private-entity`, {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          responseType: 'json',
        });
        expect(owner.body.results.map(({ id }: { id: string }) => id)).toStrictEqual([
          privateInvestigationId,
        ]);
        const ownerCounts = await getSectionCounts(apiClient, adminCookieHeader, { query: RUN });
        expect(sectionCountsOf(ownerCounts.body as SectionCountsBody, 'matching')).toMatchObject({
          medium: 1,
          high: 1,
        });
      }
    );

    apiTest(
      'does not let a user with only the read privilege write impact',
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_READ_ROLE);

        const response = await apiClient.post(IMPACT_PATH, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: { conversationId: investigationId, entities: [{ id: `${RUN}-other` }] },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      "reports the caller's investigation privileges to any signed-in user",
      async ({ samlAuth, apiClient }) => {
        const privilegesOf = async (role: Parameters<typeof samlAuth.asInteractiveUser>[0]) => {
          const { cookieHeader } = await samlAuth.asInteractiveUser(role);
          const response = await apiClient.get(INVESTIGATIONS_PRIVILEGES_PATH, {
            headers: { ...INTERNAL_HEADERS, ...cookieHeader },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          return (response.body as InvestigationsPrivilegesResponse).investigations;
        };

        expect(await privilegesOf('admin')).toStrictEqual({ read: true, manage: true });
        expect(await privilegesOf(INVESTIGATIONS_READ_ROLE)).toStrictEqual({
          read: true,
          manage: false,
        });
        expect(await privilegesOf(NO_INVESTIGATIONS_ROLE)).toStrictEqual({
          read: false,
          manage: false,
        });
      }
    );
  }
);
