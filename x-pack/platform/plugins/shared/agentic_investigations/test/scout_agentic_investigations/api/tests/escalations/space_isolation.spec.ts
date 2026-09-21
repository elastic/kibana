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
  AB_CONVERSATIONS_PATH,
  expectCreated,
  deleteConversations,
} from '../../fixtures';

/**
 * Returns a path prefixed by `/s/<spaceId>` for non-default spaces, matching the
 * pattern from agent_builder/test/scout_agent_builder/api/fixtures/space_paths.ts.
 */
function spaceUrl(path: string, spaceId: string): string {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}/${path}` : path;
}

const SPACE_ID = `esc-space-isolation-${Date.now()}`;

apiTest.describe('Escalations are isolated per Space', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  // Ids created inside the custom space — cleaned up through the AB API in the custom space.
  let spaceInvestigationId: string;
  let spaceEscalationId: string;

  apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient }) => {
    await apiServices.spaces.create({ id: SPACE_ID, name: SPACE_ID });
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));

    // Seed an investigation inside the custom space.
    const invResult = await apiClient.post(spaceUrl(AB_CONVERSATIONS_PATH, SPACE_ID), {
      headers: { ...PUBLIC_HEADERS, ...cookieHeader },
      body: {
        title: 'Scout space-isolation investigation',
        template_id: 'investigation',
        access_control: { access_mode: 'public' },
        metadata: { status: 'open', severity: 'high' },
      },
      responseType: 'json',
    });
    spaceInvestigationId = expectCreated(invResult, `investigation in space ${SPACE_ID}`);

    // Seed an escalation inside the custom space, linked to the space-scoped investigation.
    const escResult = await apiClient.post(spaceUrl(CREATE_ESCALATION_PATH, SPACE_ID), {
      headers: { ...INTERNAL_HEADERS, ...cookieHeader },
      body: { linked_investigation_id: spaceInvestigationId, visibility: 'public' },
      responseType: 'json',
    });
    spaceEscalationId = expectCreated(escResult, `escalation in space ${SPACE_ID}`);
  });

  apiTest.afterAll(async ({ apiServices, apiClient }) => {
    // Delete the seeded conversations inside the custom space before deleting the space itself.
    await deleteConversations(
      apiClient,
      [spaceEscalationId, spaceInvestigationId],
      cookieHeader,
      SPACE_ID
    );
    await apiServices.spaces.delete(SPACE_ID);
  });

  apiTest(
    'GET list in the default Space does not include an escalation from another Space',
    async ({ apiClient }) => {
      const response = await apiClient.get(LIST_ESCALATIONS_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const ids = response.body.results.map((r: { id: string }) => r.id);
      expect(ids).not.toContain(spaceEscalationId);
    }
  );

  apiTest(
    'GET list in the custom Space includes the space-scoped escalation',
    async ({ apiClient }) => {
      const response = await apiClient.get(spaceUrl(LIST_ESCALATIONS_PATH, SPACE_ID), {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const ids = response.body.results.map((r: { id: string }) => r.id);
      expect(ids).toContain(spaceEscalationId);
    }
  );

  apiTest(
    'POST create in the default Space rejects a cross-Space investigation id with 404',
    async ({ apiClient }) => {
      // The investigation lives in a different Space; the escalation service resolves it
      // via the request-scoped AB client, which applies a Space filter and 404s on a mismatch.
      const response = await apiClient.post(CREATE_ESCALATION_PATH, {
        headers: { ...INTERNAL_HEADERS, ...cookieHeader },
        body: {
          linked_investigation_id: spaceInvestigationId,
          visibility: 'public',
        },
        responseType: 'json',
      });

      // The agent_builder client returns 404 for cross-Space ids (same as inaccessible).
      expect(response).toHaveStatusCode(404);
    }
  );
});
