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
  ESCALATION_BY_ID_PATH,
  CREATE_ESCALATION_PATH,
  AB_CONVERSATIONS_PATH,
  expectCreated,
  deleteConversations,
} from '../../fixtures';

/**
 * Resolves the Kibana user profile uid for a user by having them create a temporary
 * Agent Builder conversation and reading `user.id` from the response.
 *
 * The profile uid is the stable `u_*` identifier the access-control system uses for
 * ACL entries. It differs from the username and is only available once the user has
 * an activated profile (which happens on first interactive login).
 *
 * Returns both the uid and the probe conversation id so the caller can delete it in teardown.
 */
async function resolveProfileUid(
  apiClient: any,
  cookieHeader: Record<string, string>
): Promise<{ uid: string; probeConversationId: string }> {
  const response = await apiClient.post(AB_CONVERSATIONS_PATH, {
    headers: { ...PUBLIC_HEADERS, ...cookieHeader },
    body: {
      title: '__profile-uid-probe__',
      template_id: 'investigation',
      access_control: { access_mode: 'public' },
      metadata: { status: 'open' },
    },
    responseType: 'json',
  });
  if (response.statusCode !== 200 || !response.body.id) {
    throw new Error(
      `resolveProfileUid: probe conversation creation failed (${
        response.statusCode
      }): ${JSON.stringify(response.body)}`
    );
  }
  const uid = response.body.user?.id as string | undefined;
  if (!uid) {
    throw new Error(
      `resolveProfileUid: response did not include user.id — profile may not be activated yet`
    );
  }
  return { uid, probeConversationId: response.body.id };
}

apiTest.describe(
  'Escalation access control — private escalations and collaborators',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminCookieHeader: Record<string, string>;
    let editorCookieHeader: Record<string, string>;
    let unrelatedCookieHeader: Record<string, string>;

    // Ids managed by this suite.
    let probeConversationId: string; // temporary conversation used to resolve the editor's profile uid
    let investigationId: string;
    let privateEscalationId: string;

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: editorCookieHeader } = await samlAuth.asInteractiveUser('editor'));
      ({ cookieHeader: unrelatedCookieHeader } = await samlAuth.asInteractiveUser('viewer'));

      // Resolve the editor's profile uid by creating a probe conversation as them.
      const { uid: editorProfileUid, probeConversationId: probId } = await resolveProfileUid(
        apiClient,
        editorCookieHeader
      );
      probeConversationId = probId;

      // Create an investigation to back the private escalation (admin-owned, public).
      const invResult = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...adminCookieHeader },
        body: {
          title: 'ACL test investigation',
          template_id: 'investigation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'open', severity: 'medium' },
        },
        responseType: 'json',
      });
      investigationId = expectCreated(invResult, 'investigation');

      // Create a private escalation owned by admin with the editor as collaborator.
      const escResult = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        body: {
          linked_investigation_id: investigationId,
          visibility: 'private',
          collaborators: [editorProfileUid],
        },
        responseType: 'json',
      });
      privateEscalationId = expectCreated(escResult, 'private escalation');
    });

    apiTest.afterAll(async ({ apiClient }) => {
      // The probe conversation is owned by the editor; only they can delete it.
      await deleteConversations(apiClient, [probeConversationId], editorCookieHeader);
      // The investigation and escalation are owned by admin.
      await deleteConversations(
        apiClient,
        [investigationId, privateEscalationId],
        adminCookieHeader
      );
    });

    apiTest(
      'a collaborator (editor) can see the private escalation in their list',
      async ({ apiClient }) => {
        const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const ids = response.body.results.map((r: { id: string }) => r.id);
        expect(ids).toContain(privateEscalationId);
      }
    );

    apiTest(
      'an unrelated user (viewer) cannot see the private escalation in their list',
      async ({ apiClient }) => {
        const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
          headers: { ...INTERNAL_HEADERS, ...unrelatedCookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const ids = response.body.results.map((r: { id: string }) => r.id);
        expect(ids).not.toContain(privateEscalationId);
      }
    );

    apiTest(
      'PATCH from a collaborator returns 404 — current limitation: only owner can mutate (tracked in follow-up)',
      async ({ apiClient }) => {
        // The agent_builder conversation client enforces owner-only access for patchMetadata and
        // update, so a collaborator with manage_escalations gets 404 (not 403) on PATCH.
        // This test documents the current behaviour; a follow-up issue will address it once
        // agent_builder exposes a non-owner write access mode.
        const response = await apiClient.patch(ESCALATION_BY_ID_PATH(privateEscalationId), {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          body: { title: 'Collaborator rename attempt' },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(404);
      }
    );
  }
);
