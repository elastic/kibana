/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type ElasticsearchRoleDescriptor } from '@kbn/scout';
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

const ESCALATIONS_ALL_PRIVILEGE = 'feature_agenticInvestigations.escalations_all';

/**
 * Stateful editor is base Kibana All. Escalation manage is includeIn: 'none', so All
 * can list but cannot update. Tests that verify an assignee (who is not the owner) can
 * reassign need a caller who holds manage_escalations.
 */
function editorWithEscalationManage(
  editor: ElasticsearchRoleDescriptor
): ElasticsearchRoleDescriptor {
  const applications = (editor.applications ?? []).map((application) => {
    if (!application.application.startsWith('kibana')) {
      return application;
    }
    return {
      ...application,
      privileges: [...application.privileges, ESCALATIONS_ALL_PRIVILEGE],
    };
  });
  if (
    !applications.some((application) => application.privileges.includes(ESCALATIONS_ALL_PRIVILEGE))
  ) {
    throw new Error('editor role has no Kibana application privileges to extend');
  }
  return { ...editor, applications };
}

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
  { tag: [...tags.local.stateful.classic] },
  () => {
    let adminCookieHeader: Record<string, string>;
    let editorCookieHeader: Record<string, string>;
    let viewerCookieHeader: Record<string, string>;

    let editorProfileUid: string;
    /** Used as the required initial assignee for private escalations where the editor must not be a member. */
    let viewerProfileUid: string;
    let adminProfileUid: string;

    // Probe conversation ids — each owned by the user who created it.
    let editorProbeId: string;
    let viewerProbeId: string;
    let adminProbeId: string;

    // Temporary conversations created per-test; cleaned up in afterAll.
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));
      // The editor needs escalation-manage privilege for the assignee-reassign tests.
      const editorRole = await samlAuth.fetchBuiltInRoleDescriptor('editor');
      ({ cookieHeader: editorCookieHeader } = await samlAuth.asInteractiveUser(
        editorWithEscalationManage(editorRole)
      ));

      const [editorResult, viewerResult, adminResult] = await Promise.all([
        resolveProfileUid(apiClient, editorCookieHeader),
        resolveProfileUid(apiClient, viewerCookieHeader),
        resolveProfileUid(apiClient, adminCookieHeader),
      ]);
      editorProfileUid = editorResult.uid;
      viewerProfileUid = viewerResult.uid;
      adminProfileUid = adminResult.uid;
      editorProbeId = editorResult.probeConversationId;
      viewerProbeId = viewerResult.probeConversationId;
      adminProbeId = adminResult.probeConversationId;
    });

    apiTest.afterAll(async ({ apiClient }) => {
      // Delete each probe with its owner's cookie — non-owner deletes return 404 on restricted indices.
      await deleteConversations(apiClient, [editorProbeId], editorCookieHeader);
      await deleteConversations(apiClient, [viewerProbeId], viewerCookieHeader);
      await deleteConversations(apiClient, [adminProbeId], adminCookieHeader);
      // Remaining per-test conversations are all admin-owned.
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
        body: {
          linked_investigation_id: investigationId,
          visibility: 'public',
          assignees: [adminProfileUid],
        },
        responseType: 'json',
      });
      const id = expectCreated(res, 'public escalation');
      conversationIds.push(id);
      return id;
    };

    /**
     * Creates a private escalation with the given assignee uids as the initial ACL.
     * Each call uses a unique title so list searches are narrowed to this escalation.
     */
    const createPrivateEscalation = async (
      apiClient: any,
      investigationId: string,
      assignees: string[],
      titleSuffix?: string
    ) => {
      const title = `assignees-spec-private-${Date.now()}${titleSuffix ? `-${titleSuffix}` : ''}`;
      const res = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        body: { linked_investigation_id: investigationId, visibility: 'private', assignees, title },
        responseType: 'json',
      });
      const id = expectCreated(res, 'private escalation');
      conversationIds.push(id);
      return { id, title };
    };

    /**
     * Fetches the list of escalation ids visible to the given user, optionally
     * filtered by title search. Uses `expect.poll` to handle index refresh lag.
     */
    const pollEscalationIds = async (
      apiClient: any,
      cookieHeader: Record<string, string>,
      search?: string
    ): Promise<string[]> => {
      const res = await apiClient.get(LIST_ESCALATIONS_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        query: search ? { search } : undefined,
        responseType: 'json',
      });
      if (res.statusCode !== 200) return [];
      return res.body.results.map((r: { id: string }) => r.id);
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
        // Verify the assignee was actually stored and the conversation stayed public.
        expect(res.body.metadata?.assignees).toStrictEqual([editorProfileUid]);
        expect(res.body.access_control?.access_mode).toBe('public');
      }
    );

    apiTest(
      'non-member with manage_escalations receives 404 on a private escalation',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);
        // Create private escalation with viewer as the only assignee; editor is not a member.
        const { id: escalationId } = await createPrivateEscalation(
          apiClient,
          investigationId,
          [viewerProfileUid],
          'non-member'
        );

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
        // Create private escalation with viewer as assignee; editor is not yet a member.
        const { id: escalationId, title } = await createPrivateEscalation(
          apiClient,
          investigationId,
          [viewerProfileUid],
          'owner-assigns'
        );

        // Admin assigns editor (who is not yet in the ACL)
        const assignRes = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });
        expect(assignRes).toHaveStatusCode(200);
        expect(assignRes.body.metadata?.assignees).toStrictEqual([editorProfileUid]);

        // Editor can now see the escalation in their list (they were added to the ACL).
        // Poll to handle index refresh lag.
        await expect
          .poll(() => pollEscalationIds(apiClient, editorCookieHeader, title), { timeout: 10_000 })
          .toContain(escalationId);

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
      'an assignee with converse access can reassign a private escalation',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);
        // Editor is an assignee (and ACL member) from the start
        const { id: escalationId } = await createPrivateEscalation(
          apiClient,
          investigationId,
          [editorProfileUid],
          'converse-access'
        );

        const res = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(200);
        expect(res.body.metadata?.assignees).toStrictEqual([editorProfileUid]);
      }
    );

    apiTest(
      'removing a uid from assignees revokes their ACL membership (two-way ACL sync)',
      async ({ apiClient }) => {
        const investigationId = await createInvestigation(apiClient);
        const { id: escalationId, title } = await createPrivateEscalation(
          apiClient,
          investigationId,
          [viewerProfileUid],
          'revoke'
        );

        // Assign editor — they get added to the ACL
        const assignRes = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });
        expect(assignRes).toHaveStatusCode(200);
        expect(assignRes.body.metadata?.assignees).toStrictEqual([editorProfileUid]);

        // Poll until the editor can see the escalation (ACL write indexed)
        await expect
          .poll(() => pollEscalationIds(apiClient, editorCookieHeader, title), { timeout: 10_000 })
          .toContain(escalationId);

        // Remove editor from assignees — they should be revoked from the ACL
        const removeRes = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [] },
          responseType: 'json',
        });
        expect(removeRes).toHaveStatusCode(200);

        // Poll until the editor no longer sees the escalation
        await expect
          .poll(() => pollEscalationIds(apiClient, editorCookieHeader, title), { timeout: 10_000 })
          .not.toContain(escalationId);

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
        // Start with viewer as a placeholder initial assignee (viewer won't be in the test assertion).
        // We assign both editor and viewer (two non-owner users) then remove viewer.
        const { id: escalationId, title } = await createPrivateEscalation(
          apiClient,
          investigationId,
          [viewerProfileUid],
          'selective-removal'
        );

        // Assign both editor and viewer so we have two non-owner ACL members
        const assignBothRes = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [editorProfileUid, viewerProfileUid] },
          responseType: 'json',
        });
        expect(assignBothRes).toHaveStatusCode(200);

        // Poll until the editor can see it
        await expect
          .poll(() => pollEscalationIds(apiClient, editorCookieHeader, title), { timeout: 10_000 })
          .toContain(escalationId);

        // Remove viewer (keep editor)
        const removeRes = await apiClient.put(ESCALATION_ASSIGNEES_PATH(escalationId), {
          headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
          body: { assignees: [editorProfileUid] },
          responseType: 'json',
        });
        expect(removeRes).toHaveStatusCode(200);

        // Editor still has access and can still see the escalation
        await expect
          .poll(() => pollEscalationIds(apiClient, editorCookieHeader, title), { timeout: 10_000 })
          .toContain(escalationId);

        // Viewer was revoked
        await expect
          .poll(() => pollEscalationIds(apiClient, viewerCookieHeader, title), { timeout: 10_000 })
          .not.toContain(escalationId);
      }
    );
  }
);
