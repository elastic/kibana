/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  INTERNAL_HEADERS,
  PUBLIC_HEADERS,
  INVESTIGATION_ASSIGNEES_PATH,
  AB_CONVERSATIONS_PATH,
  AB_CONVERSATION_BY_ID_PATH,
  CURRENT_USER_PROFILE_PATH,
  PROPOSALS_READ_ONLY_ROLE,
  expectCreated,
  deleteConversations,
  spaceUrl,
} from '../../fixtures';

const SPACE_ID = `inv-assignees-space-${Date.now()}`;

const createConversation = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  body: Record<string, unknown>,
  spaceId = 'default'
) =>
  apiClient.post(spaceUrl(AB_CONVERSATIONS_PATH, spaceId), {
    headers: { ...PUBLIC_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

const investigationBody = (title: string) => ({
  title,
  template_id: 'investigation',
  access_control: { access_mode: 'public' as const },
  metadata: { status: 'open', severity: 'high' },
});

apiTest.describe(
  'PATCH /internal/investigations/{id}/assignees — update investigation assignees',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let editorCookieHeader: Record<string, string>;
    let readOnlyCookieHeader: Record<string, string>;
    let investigationId: string;
    /** A real conversation that is not an investigation, so the template guard is what 404s. */
    let chatConversationId: string;
    let otherSpaceInvestigationId: string;
    /** The admin's own profile uid — the only uid guaranteed to resolve through `bulkGet`. */
    let adminProfileUid: string;

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      ({ cookieHeader: editorCookieHeader } = await samlAuth.asInteractiveUser('editor'));
      ({ cookieHeader: readOnlyCookieHeader } = await samlAuth.asInteractiveUser(
        PROPOSALS_READ_ONLY_ROLE
      ));

      // Created through the Agent Builder public API so the index stays Kibana-managed
      // (direct ES writes are rejected on restricted indices).
      investigationId = expectCreated(
        await createConversation(
          apiClient,
          cookieHeader,
          investigationBody('Scout assignees test investigation')
        ),
        'investigation'
      );

      chatConversationId = expectCreated(
        await createConversation(apiClient, cookieHeader, {
          title: 'Scout assignees test plain conversation',
          access_control: { access_mode: 'public' },
        }),
        'non-investigation conversation'
      );

      await apiServices.spaces.create({ id: SPACE_ID, name: SPACE_ID });
      otherSpaceInvestigationId = expectCreated(
        await createConversation(
          apiClient,
          cookieHeader,
          investigationBody('Scout assignees cross-space investigation'),
          SPACE_ID
        ),
        `investigation in space ${SPACE_ID}`
      );

      const profileResponse = await apiClient.get(spaceUrl(CURRENT_USER_PROFILE_PATH, 'default'), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      if (profileResponse.statusCode !== 200 || !profileResponse.body.uid) {
        throw new Error(
          `Setup: failed to read the current user profile (status ${
            profileResponse.statusCode
          }): ${JSON.stringify(profileResponse.body)}`
        );
      }
      adminProfileUid = profileResponse.body.uid;
    });

    apiTest.afterAll(async ({ apiServices, apiClient }) => {
      await deleteConversations(apiClient, [otherSpaceInvestigationId], cookieHeader, SPACE_ID);
      await apiServices.spaces.delete(SPACE_ID);
      await deleteConversations(apiClient, [investigationId, chatConversationId], cookieHeader);
    });

    apiTest(
      'assigns a real profile uid and persists it on the conversation',
      async ({ apiClient }) => {
        const response = await apiClient.patch(INVESTIGATION_ASSIGNEES_PATH(investigationId), {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: { assignees: [adminProfileUid] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.assignees).toStrictEqual([adminProfileUid]);

        // Re-read through Agent Builder: the response could echo the request without the
        // metadata write having landed.
        const stored = await apiClient.get(
          spaceUrl(AB_CONVERSATION_BY_ID_PATH(investigationId), 'default'),
          {
            headers: { ...PUBLIC_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(stored).toHaveStatusCode(200);
        // A single-element array round-trips through the ES `flattened` field as a bare string.
        expect([stored.body.metadata.assignees].flat()).toStrictEqual([adminProfileUid]);
      }
    );

    apiTest(
      'removes all assignees when given an empty array and returns 200',
      async ({ apiClient }) => {
        const response = await apiClient.patch(INVESTIGATION_ASSIGNEES_PATH(investigationId), {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: { assignees: [] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.assignees).toStrictEqual([]);
      }
    );

    apiTest(
      'returns 404 for a conversation that exists but is not an investigation',
      async ({ apiClient }) => {
        const response = await apiClient.patch(INVESTIGATION_ASSIGNEES_PATH(chatConversationId), {
          headers: { ...INTERNAL_HEADERS, ...cookieHeader },
          body: { assignees: [] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest('returns 404 for a conversation id that does not exist', async ({ apiClient }) => {
      const response = await apiClient.patch(INVESTIGATION_ASSIGNEES_PATH('not-an-inv-id'), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { assignees: [] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns 400 when an assignee profile uid does not exist', async ({ apiClient }) => {
      const response = await apiClient.patch(INVESTIGATION_ASSIGNEES_PATH(investigationId), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: { assignees: ['uid-does-not-exist-abc123'] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('"uid-does-not-exist-abc123"');
    });

    apiTest(
      'returns 403 for a user holding only the investigations read privilege',
      async ({ apiClient }) => {
        const response = await apiClient.patch(INVESTIGATION_ASSIGNEES_PATH(investigationId), {
          headers: { ...INTERNAL_HEADERS, ...readOnlyCookieHeader },
          body: { assignees: [] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'returns 404 in the default Space for an investigation that lives in another Space',
      async ({ apiClient }) => {
        // The route takes an arbitrary conversation id, so Space isolation rests entirely on the
        // request-scoped Agent Builder client. A client built without the incoming Space context
        // would find the conversation and write to it.
        const response = await apiClient.patch(
          INVESTIGATION_ASSIGNEES_PATH(otherSpaceInvestigationId),
          {
            headers: { ...INTERNAL_HEADERS, ...cookieHeader },
            body: { assignees: [adminProfileUid] },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(404);

        const stored = await apiClient.get(
          spaceUrl(AB_CONVERSATION_BY_ID_PATH(otherSpaceInvestigationId), SPACE_ID),
          {
            headers: { ...PUBLIC_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(stored).toHaveStatusCode(200);
        expect(stored.body.metadata?.assignees).toBeUndefined();
      }
    );

    apiTest(
      'returns 404 for a non-owner — current limitation: only the owner can mutate (tracked in follow-up)',
      async ({ apiClient }) => {
        // `ConversationPublicClient.patchMetadata` delegates to an owner-only write path, so a
        // user holding manage_investigations who did not create the conversation gets 404 rather
        // than 403. This documents current behaviour; a follow-up lands once agent_builder
        // exposes a non-owner write access mode.
        const response = await apiClient.patch(INVESTIGATION_ASSIGNEES_PATH(investigationId), {
          headers: { ...INTERNAL_HEADERS, ...editorCookieHeader },
          body: { assignees: [] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(404);
      }
    );
  }
);
