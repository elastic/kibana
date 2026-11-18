/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  AB_CONVERSATION_BY_ID_PATH,
  IMPACT_PATH,
  INTERNAL_HEADERS,
  INVESTIGATION_BY_ID_PATH,
  INVESTIGATIONS_PATH,
  PUBLIC_HEADERS,
  cleanupSubjects,
  deleteConversations,
  seedInvestigation,
  seedSubject,
} from '../../fixtures';

const RUN = `scout-removed-${Date.now()}`;

interface RowBody {
  id: string;
  impact?: object;
  subjects: Array<{ id: string }>;
}

apiTest.describe(
  'Investigation documents whose attachment the user removed',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    // An unattached subject plus a removed impact: two unconfirmed documents.
    let investigationId: string;
    // Only a removed impact: one unconfirmed document.
    let impactOnlyId: string;

    /** Attaches impact through the internal route, then removes the attachment as a user would. */
    const attachThenRemoveImpact = async (apiClient: ApiClientFixture, conversationId: string) => {
      const impact = await apiClient.post(IMPACT_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { conversationId, entities: [{ id: `${RUN}-entity` }] },
        responseType: 'json',
      });
      expect(impact).toHaveStatusCode(200);
      const impactAttachmentId = (impact.body as { id: string }).id;
      // Agent Builder soft-deletes it: the attachment stays on the conversation, inactive.
      const removed = await apiClient.delete(
        `${AB_CONVERSATION_BY_ID_PATH(conversationId)}/attachments/${impactAttachmentId}`,
        { headers: { ...PUBLIC_HEADERS, ...cookieHeader }, responseType: 'json' }
      );
      expect(removed).toHaveStatusCode(200);
    };

    apiTest.beforeAll(async ({ samlAuth, apiClient, esClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      investigationId = await seedInvestigation(apiClient, cookieHeader, {
        title: `${RUN} investigation`,
        metadata: { status: 'open', severity: 'low', summary: `${RUN} summary` },
      });
      impactOnlyId = await seedInvestigation(apiClient, cookieHeader, {
        title: `${RUN} impact only`,
        metadata: { status: 'open', severity: 'low', summary: `${RUN} impact only` },
      });
      await attachThenRemoveImpact(apiClient, investigationId);
      await attachThenRemoveImpact(apiClient, impactOnlyId);

      // A subject that was never attached (as during a running agent turn) stays visible.
      await seedSubject(esClient, {
        conversationId: investigationId,
        type: 'alert',
        id: `${RUN}-alert`,
      });
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await cleanupSubjects(esClient, [investigationId]);
      await deleteConversations(apiClient, [investigationId, impactOnlyId], cookieHeader);
    });

    apiTest(
      'GET hides the removed impact and keeps the unattached subject',
      async ({ apiClient }) => {
        const response = await apiClient.get(INVESTIGATION_BY_ID_PATH(investigationId), {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as RowBody;
        expect(body.impact).toBeUndefined();
        expect(body.subjects.map(({ id }) => id)).toStrictEqual([`${RUN}-alert`]);
      }
    );

    apiTest(
      'the list hides removed impact and keeps the unattached subject',
      async ({ apiClient }) => {
        const response = await apiClient.get(`${INVESTIGATIONS_PATH}?query=${RUN}`, {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const rows = new Map((response.body.results as RowBody[]).map((row) => [row.id, row]));
        expect(rows.size).toBe(2);
        // Two unconfirmed documents: told apart by reading the conversation.
        expect(rows.get(investigationId)?.impact).toBeUndefined();
        expect(rows.get(investigationId)?.subjects.map(({ id }) => id)).toStrictEqual([
          `${RUN}-alert`,
        ]);
        // One unconfirmed document: the attachment id search alone finds it removed.
        expect(rows.get(impactOnlyId)?.impact).toBeUndefined();
      }
    );
  }
);
