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
  INTERNAL_HEADERS,
  CREATE_ESCALATION_PATH,
  ESCALATION_LINK_PATH,
  expectCreated,
  deleteConversations,
  seedInvestigation,
  editorWithEscalationManage,
  resolveProfileUid,
} from '../../fixtures';

apiTest.describe(
  'POST /internal/investigations/escalations/{id}/_link — owner and participant check',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminCookieHeader: Record<string, string>;
    let editorCookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;

    let adminProfileUid: string;
    let editorProfileUid: string;
    let viewerProfileUid: string;

    let adminProbeId: string;
    let editorProbeId: string;
    let viewerProbeId: string;

    // Admin-owned conversations created per test.
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));
      // manage_escalations lets the editor past the route privilege, so the response comes
      // from the owner/participant check.
      const editorRole = await samlAuth.fetchBuiltInRoleDescriptor('editor');
      ({ cookieHeader: editorCookieHeader } = await samlAuth.asInteractiveUser(
        editorWithEscalationManage(editorRole)
      ));

      const [admin, editor, viewer] = await Promise.all([
        resolveProfileUid(apiClient, adminCookieHeader),
        resolveProfileUid(apiClient, editorCookieHeader),
        resolveProfileUid(apiClient, viewerCookieHeader),
      ]);
      ({ uid: adminProfileUid, probeConversationId: adminProbeId } = admin);
      ({ uid: editorProfileUid, probeConversationId: editorProbeId } = editor);
      ({ uid: viewerProfileUid, probeConversationId: viewerProbeId } = viewer);
    });

    apiTest.afterAll(async ({ apiClient }) => {
      // Non-owner deletes return 404, so each probe is deleted by its owner.
      await deleteConversations(apiClient, [adminProbeId], adminCookieHeader);
      await deleteConversations(apiClient, [editorProbeId], editorCookieHeader);
      await deleteConversations(apiClient, [viewerProbeId], viewerCookieHeader);
      await deleteConversations(apiClient, [...conversationIds], adminCookieHeader);
    });

    const createInvestigation = async (apiClient: ApiClientFixture): Promise<string> => {
      const id = await seedInvestigation(apiClient, adminCookieHeader, {
        title: 'Link access spec investigation',
      });
      conversationIds.push(id);
      return id;
    };

    const createEscalation = async (
      apiClient: ApiClientFixture,
      { visibility, assignees }: { visibility: 'public' | 'private'; assignees: readonly string[] }
    ): Promise<string> => {
      const linkedInvestigationId = await createInvestigation(apiClient);
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        body: { linked_investigation_id: linkedInvestigationId, visibility, assignees },
        responseType: 'json',
      });
      const id = expectCreated(response, `${visibility} escalation`);
      conversationIds.push(id);
      return id;
    };

    apiTest(
      'returns 403 for a non-participant with manage_escalations on a public escalation',
      async ({ apiClient }) => {
        const escalationId = await createEscalation(apiClient, {
          visibility: 'public',
          assignees: [adminProfileUid],
        });
        const investigationId = await createInvestigation(apiClient);

        const response = await apiClient.post(ESCALATION_LINK_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          body: { linked_investigations: [investigationId] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
        expect(response.body.message).toContain('Only the owner or a participant');
      }
    );

    apiTest(
      'lets a participant who is not the owner link to a private escalation',
      async ({ apiClient }) => {
        const escalationId = await createEscalation(apiClient, {
          visibility: 'private',
          assignees: [adminProfileUid, editorProfileUid],
        });
        const investigationId = await createInvestigation(apiClient);

        const response = await apiClient.post(ESCALATION_LINK_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          body: { linked_investigations: [investigationId] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.metadata.linked_investigations).toContain(investigationId);
      }
    );

    apiTest(
      'returns 404 for a non-participant on a private escalation they cannot read',
      async ({ apiClient }) => {
        // Viewer is the only assignee, so the editor is not on the ACL.
        const escalationId = await createEscalation(apiClient, {
          visibility: 'private',
          assignees: [viewerProfileUid],
        });
        const investigationId = await createInvestigation(apiClient);

        const response = await apiClient.post(ESCALATION_LINK_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          body: { linked_investigations: [investigationId] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(404);
      }
    );
  }
);
