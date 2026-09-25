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
  PUBLIC_HEADERS,
  INVESTIGATION_ASSIGNEES_PATH,
  CREATE_ESCALATION_PATH,
  AB_CONVERSATIONS_PATH,
  expectCreated,
  deleteConversations,
} from '../../fixtures';

apiTest.describe(
  'Investigation assignees endpoint — authorization',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminCookieHeader: Record<string, string>;
    let editorCookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;

    let editorProfileUid: string;
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: editorCookieHeader } = await samlAuth.asInteractiveUser('editor'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));

      // Resolve editor profile uid
      const probeRes = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...editorCookieHeader },
        body: {
          title: '__investigations-assignees-probe__',
          template_id: 'investigation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'open' },
        },
        responseType: 'json',
      });
      if (probeRes.statusCode !== 200) {
        throw new Error(`Setup: probe creation failed (${probeRes.statusCode})`);
      }
      editorProfileUid = probeRes.body.user?.id as string;
      conversationIds.push(probeRes.body.id);
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await deleteConversations(apiClient, [...conversationIds], adminCookieHeader);
    });

    /** Creates a public investigation owned by admin. */
    const createInvestigation = async (apiClient: any) => {
      const res = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...adminCookieHeader },
        body: {
          title: 'Investigations assignees spec investigation',
          template_id: 'investigation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'open' },
        },
        responseType: 'json',
      });
      const id = expectCreated(res, 'investigation');
      conversationIds.push(id);
      return id;
    };

    apiTest('viewer (no manage_investigations) receives 403', async ({ apiClient }) => {
      const investigationId = await createInvestigation(apiClient);

      const res = await apiClient.put(INVESTIGATION_ASSIGNEES_PATH(investigationId), {
        headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
        body: { assignees: [editorProfileUid] },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(403);
    });

    apiTest(
      'admin (manage_investigations) can reassign a public investigation',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);

        const res = await apiClient.put(INVESTIGATION_ASSIGNEES_PATH(investigationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
      }
    );

    apiTest(
      'editor (has manage_investigations) can reassign a public investigation',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);

        const res = await apiClient.put(INVESTIGATION_ASSIGNEES_PATH(investigationId), {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
      }
    );

    apiTest(
      'supplying an escalation id to the investigation assignees route returns 404 (wrong template)',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);
        // Create an escalation to get an id typed as 'escalation'
        const escRes = await apiClient.post(CREATE_ESCALATION_PATH, {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: {
            linked_investigation_id: investigationId,
            visibility: 'public',
            collaborators: [],
          },
          responseType: 'json',
        });
        const escalationId = expectCreated(escRes, 'escalation');
        conversationIds.push(escalationId);

        const res = await apiClient.put(INVESTIGATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [] },
          responseType: 'json',
        });

        // WrongTemplateError → 404
        expect(res).toHaveStatusCode(404);
      }
    );
  }
);
