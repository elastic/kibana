/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  INTERNAL_HEADERS,
  PUBLIC_HEADERS,
  AB_CONVERSATIONS_PATH,
  CREATE_ESCALATION_PATH,
  AB_CONVERSATION_BY_ID_PATH,
  ESCALATION_LINK_PATH,
  createIdentities,
  deleteConversations,
  expectCreated,
} from '../../fixtures';
import type { IdentityFixture, TestIdentity } from '../../fixtures';

/** Everyone holds this exact role, so ownership is the only thing that tells them apart. */
const ESCALATIONS_ALL_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { agenticInvestigations: ['all', 'escalations_all'], agentBuilder: ['all'] },
      spaces: ['*'],
    },
  ],
};

apiTest.describe(
  'POST /internal/investigations/escalations/{id}/_link — only the owner or a participant can link',
  // The suite logs in as native users through the `cloud-basic` provider, which is not verified on
  // cloud, so it runs locally only.
  { tag: ['@local-stateful-classic'] },
  () => {
    let fixture: IdentityFixture | undefined;
    let owner: TestIdentity;
    let assignee: TestIdentity;
    let outsider: TestIdentity;
    let investigationIds: string[];
    /** Public: any signed-in user can read it, so a non-participant reaches the ownership check. */
    let escalationId: string;
    /** Private: its assignees are ACL members, which is what makes someone a participant. */
    let privateEscalationId: string;
    /** Everything `beforeAll` created, so a failure partway through still cleans up. */
    const createdConversationIds: string[] = [];

    const createInvestigation = async (apiClient: ApiClientFixture, title: string) => {
      const response = await apiClient.post(AB_CONVERSATIONS_PATH, {
        headers: { ...PUBLIC_HEADERS, ...owner.cookieHeader },
        body: {
          title,
          template_id: 'investigation',
          access_control: { access_mode: 'public' },
          metadata: { status: 'open' },
        },
        responseType: 'json',
      });
      const id = expectCreated(response, title);
      createdConversationIds.push(id);
      return id;
    };

    const linkAs = (
      apiClient: ApiClientFixture,
      caller: TestIdentity,
      targetEscalationId: string,
      investigationId: string
    ) =>
      apiClient.post(ESCALATION_LINK_PATH(targetEscalationId), {
        headers: { ...INTERNAL_HEADERS, ...caller.cookieHeader },
        body: { linked_investigations: [investigationId] },
        responseType: 'json',
      });

    const getEscalation = (apiClient: ApiClientFixture, id: string) =>
      apiClient.get(AB_CONVERSATION_BY_ID_PATH(id), {
        headers: { ...PUBLIC_HEADERS, ...owner.cookieHeader },
        responseType: 'json',
      });

    apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, log }) => {
      fixture = await createIdentities({
        esClient,
        kbnClient,
        apiClient,
        log,
        role: ESCALATIONS_ALL_ROLE,
        count: 3,
        prefix: 'scout_link_owner',
      });
      [owner, assignee, outsider] = fixture.identities;

      investigationIds = [
        await createInvestigation(apiClient, 'Scout link ownership: backing investigation'),
        await createInvestigation(apiClient, 'Scout link ownership: investigation to link (owner)'),
        await createInvestigation(
          apiClient,
          'Scout link ownership: investigation to link (assignee)'
        ),
        await createInvestigation(
          apiClient,
          'Scout link ownership: investigation to link (outsider)'
        ),
        await createInvestigation(
          apiClient,
          'Scout link ownership: investigation to link (public assignee)'
        ),
      ];

      const createEscalation = async (visibility: 'public' | 'private') => {
        const id = expectCreated(
          await apiClient.post(CREATE_ESCALATION_PATH, {
            headers: { ...INTERNAL_HEADERS, ...owner.cookieHeader },
            body: {
              linked_investigation_id: investigationIds[0],
              visibility,
              assignees: [assignee.profileUid],
            },
            responseType: 'json',
          }),
          `${visibility} escalation`
        );
        createdConversationIds.push(id);
        return id;
      };
      escalationId = await createEscalation('public');
      privateEscalationId = await createEscalation('private');
    });

    apiTest.afterAll(async ({ apiClient }) => {
      try {
        // The owner is the only identity that can delete these, so there is nothing to do without it.
        const ownerCookieHeader = fixture?.identities[0]?.cookieHeader;
        if (ownerCookieHeader) {
          await deleteConversations(apiClient, createdConversationIds, ownerCookieHeader);
        }
      } finally {
        await fixture?.cleanup();
      }
    });

    apiTest('the owner can link an investigation', async ({ apiClient }) => {
      const response = await linkAs(apiClient, owner, escalationId, investigationIds[1]);

      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.linked_investigations).toContain(investigationIds[1]);
    });

    apiTest(
      'an assignee of a private escalation, who does not own it, can link an investigation',
      async ({ apiClient }) => {
        const response = await linkAs(
          apiClient,
          assignee,
          privateEscalationId,
          investigationIds[2]
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.metadata.linked_investigations).toContain(investigationIds[2]);
      }
    );

    apiTest(
      'a caller with the same role who is neither owner nor participant is refused and changes nothing',
      async ({ apiClient }) => {
        const before = await getEscalation(apiClient, escalationId);
        expect(before).toHaveStatusCode(200);

        const response = await linkAs(apiClient, outsider, escalationId, investigationIds[3]);

        expect(response).toHaveStatusCode(403);
        expect(response.body.message).toBe(
          `Only the owner or a participant can link investigations to escalation "${escalationId}"`
        );

        const after = await getEscalation(apiClient, escalationId);
        expect(after).toHaveStatusCode(200);
        expect(after.body.metadata.linked_investigations).toStrictEqual(
          before.body.metadata.linked_investigations
        );
        expect(after.body.metadata.linked_investigations).not.toContain(investigationIds[3]);
        expect(after.body.updated_at).toBe(before.body.updated_at);
      }
    );

    // Pins the current behaviour of the fix for #300772, not a confirmed requirement: public
    // escalations have no ACL entries, so an assignee is not a participant. Change if product differs.
    apiTest(
      'an assignee of a public escalation is refused (public escalations have no ACL entries)',
      async ({ apiClient }) => {
        const before = await getEscalation(apiClient, escalationId);
        expect(before).toHaveStatusCode(200);

        const response = await linkAs(apiClient, assignee, escalationId, investigationIds[4]);

        expect(response).toHaveStatusCode(403);

        const after = await getEscalation(apiClient, escalationId);
        expect(after.body.metadata.linked_investigations).toStrictEqual(
          before.body.metadata.linked_investigations
        );
        expect(after.body.metadata.linked_investigations).not.toContain(investigationIds[4]);
      }
    );
  }
);
