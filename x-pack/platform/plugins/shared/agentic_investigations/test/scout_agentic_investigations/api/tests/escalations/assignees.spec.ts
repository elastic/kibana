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
  LIST_ESCALATIONS_PATH,
  CREATE_ESCALATION_PATH,
  ESCALATION_ASSIGNEES_PATH,
  AB_CONVERSATIONS_PATH,
  expectCreated,
  deleteConversations,
} from '../../fixtures';

/**
 * Resolves a user's profile uid by creating a temporary probe conversation as them.
 * The profile uid is the stable `u_*` identifier used for ACL entries and assignees.
 */
async function resolveProfileUid(
  apiClient: any,
  cookieHeader: Record<string, string>
): Promise<{ uid: string; probeConversationId: string }> {
  const response = await apiClient.post(AB_CONVERSATIONS_PATH, {
    headers: { ...PUBLIC_HEADERS, ...cookieHeader },
    body: {
      title: '__assignees-spec-probe__',
      template_id: 'investigation',
      access_control: { access_mode: 'public' },
      metadata: { status: 'open' },
    },
    responseType: 'json',
  });
  if (response.statusCode !== 200 || !response.body.id) {
    throw new Error(
      `resolveProfileUid: probe creation failed (${response.statusCode}): ${JSON.stringify(
        response.body
      )}`
    );
  }
  const uid = response.body.user?.id as string | undefined;
  if (!uid) {
    throw new Error(`resolveProfileUid: response did not include user.id`);
  }
  return { uid, probeConversationId: response.body.id };
}

apiTest.describe(
  'Escalation assignees endpoint — authorization and ACL sync',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminCookieHeader: Record<string, string>;
    let editorCookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;

    let editorProfileUid: string;
    /** Used as the required initial collaborator for private escalations where the editor must not be a member. */
    let viewerProfileUid: string;
    let adminProfileUid: string;

    // Temporary conversations created during setup / per-test; cleaned up in afterAll.
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: editorCookieHeader } = await samlAuth.asInteractiveUser('editor'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));

      const [editorResult, viewerResult, adminResult] = await Promise.all([
        resolveProfileUid(apiClient, editorCookieHeader),
        resolveProfileUid(apiClient, viewerCookieHeader),
        resolveProfileUid(apiClient, adminCookieHeader),
      ]);
      editorProfileUid = editorResult.uid;
      viewerProfileUid = viewerResult.uid;
      adminProfileUid = adminResult.uid;
      conversationIds.push(
        editorResult.probeConversationId,
        viewerResult.probeConversationId,
        adminResult.probeConversationId
      );
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await deleteConversations(apiClient, [...conversationIds], adminCookieHeader);
    });

    /** Creates a public investigation (returns its id). */
    const createInvestigation = async (apiClient: any) => {
      const res = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...adminCookieHeader },
        body: {
          title: 'Assignees spec investigation',
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

    /** Creates a public escalation linked to the given investigation (returns its id). */
    const createPublicEscalation = async (apiClient: any, investigationId: string) => {
      const res = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        body: { linked_investigation_id: investigationId, visibility: 'public', collaborators: [] },
        responseType: 'json',
      });
      const id = expectCreated(res, 'public escalation');
      conversationIds.push(id);
      return id;
    };

    /** Creates a private escalation with the given collaborator uids (returns its id). */
    const createPrivateEscalation = async (
      apiClient: any,
      investigationId: string,
      collaborators: string[]
    ) => {
      const res = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        body: { linked_investigation_id: investigationId, visibility: 'private', collaborators },
        responseType: 'json',
      });
      const id = expectCreated(res, 'private escalation');
      conversationIds.push(id);
      return id;
    };

    apiTest(
      'viewer (no manage_escalations) receives 403 on a public escalation',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);
        const escalationId = await createPublicEscalation(apiClient, investigationId);

        const res = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...viewerCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
      }
    );

    apiTest(
      'admin (manage_escalations) can reassign a public escalation',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);
        const escalationId = await createPublicEscalation(apiClient, investigationId);

        const res = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
      }
    );

    apiTest(
      'non-member with manage_escalations receives 404 on a private escalation',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);
        // Create private escalation with viewer as the only collaborator; editor is not a member.
        const escalationId = await createPrivateEscalation(apiClient, investigationId, [
          viewerProfileUid,
        ]);

        const res = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });

        // A non-member cannot even see the escalation — masked as 404
        expect(res).toHaveStatusCode(404);
      }
    );

    apiTest(
      'owner assigns a non-collaborator; the new assignee can then list the escalation and reassign it',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);
        // Create private escalation with viewer as collaborator; editor is not yet a member.
        const escalationId = await createPrivateEscalation(apiClient, investigationId, [
          viewerProfileUid,
        ]);

        // Admin assigns editor (who is not a collaborator)
        const assignRes = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });
        expect(assignRes).toHaveStatusCode(200);

        // Editor can now see the escalation in their list (they were added to the ACL)
        const listRes = await apiClient.get(LIST_ESCALATIONS_PATH, {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          responseType: 'json',
        });
        expect(listRes).toHaveStatusCode(200);
        const ids = listRes.body.results.map((r: { id: string }) => r.id);
        expect(ids).toContain(escalationId);

        // Editor (now an assignee and ACL member) can also reassign
        const reassignRes = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });
        expect(reassignRes).toHaveStatusCode(200);
      }
    );

    apiTest(
      'a collaborator (not assigned) can still reassign a private escalation',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);
        // Editor is a collaborator from the start
        const escalationId = await createPrivateEscalation(apiClient, investigationId, [
          editorProfileUid,
        ]);

        const res = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          body: { assignees: [] },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
      }
    );

    apiTest(
      'removing a uid from assignees revokes their ACL membership (two-way ACL sync)',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);
        const escalationId = await createPrivateEscalation(apiClient, investigationId, [
          viewerProfileUid,
        ]);

        // Assign editor — they get added to the ACL
        await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });

        // Remove editor from assignees — they should be revoked from the ACL
        const removeRes = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [] },
          responseType: 'json',
        });
        expect(removeRes).toHaveStatusCode(200);

        // Editor no longer sees the escalation in their list
        const listRes = await apiClient.get(LIST_ESCALATIONS_PATH, {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          responseType: 'json',
        });
        expect(listRes).toHaveStatusCode(200);
        const ids = listRes.body.results.map((r: { id: string }) => r.id);
        expect(ids).not.toContain(escalationId);

        // Editor gets 404 when trying to reassign (they no longer have access)
        const reassignRes = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          body: { assignees: [] },
          responseType: 'json',
        });
        expect(reassignRes).toHaveStatusCode(404);
      }
    );

    apiTest(
      'removing one assignee leaves the other assignee with full access',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);
        const escalationId = await createPrivateEscalation(apiClient, investigationId, [
          viewerProfileUid,
        ]);

        // Assign both editor and admin
        await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [editorProfileUid, adminProfileUid] },
          responseType: 'json',
        });

        // Remove only admin (keep editor)
        const removeRes = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });
        expect(removeRes).toHaveStatusCode(200);

        // Editor still has access and can still see the escalation
        const listRes = await apiClient.get(LIST_ESCALATIONS_PATH, {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          responseType: 'json',
        });
        expect(listRes).toHaveStatusCode(200);
        const ids = listRes.body.results.map((r: { id: string }) => r.id);
        expect(ids).toContain(escalationId);
      }
    );
  }
);
