/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { expect } from '@kbn/scout/api';
import {
  apiTest,
  cleanupProposalFixtures,
  getProposal,
  PROPOSALS_MANAGE_ROLE,
  PROPOSALS_READ_ONLY_ROLE,
  seedProposal,
  reviseProposal,
  trackProposal,
} from '../fixtures';

apiTest.describe(
  'POST /internal/investigations/proposals/{proposalId}/revisions',
  // `agenticInvestigations.enabled` defaults to false and is turned on only by
  // this suite's local config, so the cloud half of `stateful.classic` would
  // exercise an unregistered route and still pass.
  { tag: ['@local-stateful-classic'] },
  () => {
    // Every seed and every revision this file creates is removed again, so a
    // rerun starts from the same state as the first run instead of inheriting
    // documents (and their chains) from it.
    apiTest.afterAll(async ({ esClient }) => {
      await cleanupProposalFixtures(esClient);
    });

    apiTest(
      'creates a new pending revision and supersedes the original',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(PROPOSALS_MANAGE_ROLE);
        const { id: originalId } = await seedProposal(esClient, {
          comment: 'Original comment',
          impact: 'low',
          confidence: 'medium',
        });

        const reviseResponse = await reviseProposal(apiClient, cookieHeader, originalId, {
          comment: 'Revised comment',
          impact: 'high',
          confidence: 'high',
        });
        // Tracked before the assertions: the child is written before its predecessor
        // is updated and kept on an ambiguous failure, so the id can exist on non-200.
        trackProposal(reviseResponse.body?.proposalId);
        expect(reviseResponse).toHaveStatusCode(200);
        const { proposalId: newProposalId, revision } = reviseResponse.body;
        expect(typeof newProposalId).toBe('string');
        expect(newProposalId).not.toBe(originalId);
        expect(revision).toBe(2);

        const replacementResponse = await getProposal(apiClient, cookieHeader, newProposalId);
        expect(replacementResponse).toHaveStatusCode(200);
        expect(replacementResponse.body.status).toBe('pending');
        expect(replacementResponse.body.comment).toBe('Revised comment');
        expect(replacementResponse.body.impact).toBe('high');
        expect(replacementResponse.body.confidence).toBe('high');
        // Inherited from the predecessor rather than re-resolved, so a revision
        // cannot silently relabel who a proposal came from.
        expect(replacementResponse.body.origin).toBe('worker');
        expect(replacementResponse.body.revision).toBe(2);
        expect(replacementResponse.body.rootProposalId).toBe(originalId);
        expect(replacementResponse.body.supersedes).toBe(originalId);
        expect(replacementResponse.body.supersededBy).toBeUndefined();
        expect(replacementResponse.body.decidedAt).toBeUndefined();

        // The original is superseded, not dismissed — being revised is not a
        // human rejection — and points at its replacement.
        const originalResponse = await getProposal(apiClient, cookieHeader, originalId);
        expect(originalResponse).toHaveStatusCode(200);
        expect(originalResponse.body.status).toBe('superseded');
        expect(originalResponse.body.supersededBy).toBe(newProposalId);

        // Deliberately NOT asserted: workflow resumption. Revising must not release
        // the parked gate, and there is no observable side effect here — that is
        // covered by unit tests on `ProposalsService.revise()`.
      }
    );

    apiTest(
      'keeps rootProposalId stable and increments revision across a multi-hop chain',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(PROPOSALS_MANAGE_ROLE);
        const { id: rootId } = await seedProposal(esClient);

        const firstRevise = await reviseProposal(apiClient, cookieHeader, rootId, {
          comment: 'revision 2',
        });
        trackProposal(firstRevise.body?.proposalId);
        expect(firstRevise).toHaveStatusCode(200);
        const secondId: string = firstRevise.body.proposalId;
        expect(firstRevise.body.revision).toBe(2);

        const secondRevise = await reviseProposal(apiClient, cookieHeader, secondId, {
          comment: 'revision 3',
        });
        trackProposal(secondRevise.body?.proposalId);
        expect(secondRevise).toHaveStatusCode(200);
        const thirdId: string = secondRevise.body.proposalId;
        expect(secondRevise.body.revision).toBe(3);

        const thirdProposal = await getProposal(apiClient, cookieHeader, thirdId);
        expect(thirdProposal.body.rootProposalId).toBe(rootId);
        expect(thirdProposal.body.supersedes).toBe(secondId);
        expect(thirdProposal.body.revision).toBe(3);
      }
    );

    apiTest('returns 404 for a proposal that does not exist', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(PROPOSALS_MANAGE_ROLE);
      const response = await reviseProposal(apiClient, cookieHeader, 'does-not-exist', {
        comment: 'irrelevant',
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest(
      'returns 409 when the proposal is no longer pending',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(PROPOSALS_MANAGE_ROLE);
        // Seeded settled: with no real workflow execution behind it, the
        // dismiss/approve routes would 409 on the resume rather than on what is
        // being tested here.
        const { id } = await seedProposal(esClient, { status: 'no_action' });

        const response = await reviseProposal(apiClient, cookieHeader, id, { comment: 'too late' });
        expect(response).toHaveStatusCode(409);
      }
    );

    apiTest(
      'returns 409 when revising a proposal that is already superseded',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(PROPOSALS_MANAGE_ROLE);
        const { id } = await seedProposal(esClient);

        const firstRevise = await reviseProposal(apiClient, cookieHeader, id, {
          comment: 'first',
        });
        trackProposal(firstRevise.body?.proposalId);
        expect(firstRevise).toHaveStatusCode(200);

        // The original is now superseded; a second revise attempt on it must
        // fail even though it was never explicitly dismissed.
        const secondRevise = await reviseProposal(apiClient, cookieHeader, id, {
          comment: 'second',
        });
        expect(secondRevise).toHaveStatusCode(409);
      }
    );

    apiTest(
      'returns 403 for a caller without manage_proposals',
      async ({ apiClient, esClient, samlAuth }) => {
        const { id } = await seedProposal(esClient);

        const readOnly = await samlAuth.asInteractiveUser(PROPOSALS_READ_ONLY_ROLE);
        const response = await reviseProposal(apiClient, readOnly.cookieHeader, id, {
          comment: 'should be rejected',
        });
        expect(response).toHaveStatusCode(403);

        // Confirm the read-only caller's rejection was authz, not something
        // else: it can still read the proposal, which never moved from `pending`.
        const stillPending = await getProposal(apiClient, readOnly.cookieHeader, id);
        expect(stillPending).toHaveStatusCode(200);
        expect(stillPending.body.status).toBe('pending');
      }
    );

    apiTest(
      'returns 400 for a comment exceeding the length cap',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(PROPOSALS_MANAGE_ROLE);
        const { id } = await seedProposal(esClient);

        const response = await reviseProposal(apiClient, cookieHeader, id, {
          comment: 'x'.repeat(8193),
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    // Feature-privilege isolation (the 403 case above) and Space isolation are
    // different boundaries: the same authorized user must not be able to reach
    // a proposal that lives in another Space.
    apiTest(
      'does not revise a proposal from another space',
      async ({ apiClient, esClient, kbnClient, samlAuth }) => {
        // Unique per run: fixed ids collide with Spaces an interrupted run left
        // behind, failing the create before a single assertion runs.
        const SPACE_A = `agentic-investigations-a-${randomUUID()}`;
        const SPACE_B = `agentic-investigations-b-${randomUUID()}`;
        const created: string[] = [];

        try {
          for (const spaceId of [SPACE_A, SPACE_B]) {
            await kbnClient.request({
              method: 'POST',
              path: '/api/spaces/space',
              body: { id: spaceId, name: spaceId, disabledFeatures: [] },
            });
            // Recorded per iteration, so a failure creating SPACE_B still leaves
            // SPACE_A in the list the `finally` cleans up.
            created.push(spaceId);
          }

          // `PROPOSALS_MANAGE_ROLE` is scoped to `spaces: ['*']`, so this user
          // is genuinely authorized in both spaces — the rejection below can
          // only come from the document's own space, not from privileges.
          const { cookieHeader } = await samlAuth.asInteractiveUser(PROPOSALS_MANAGE_ROLE);
          const { id } = await seedProposal(esClient, {
            spaceId: SPACE_A,
            comment: 'Space A only',
          });

          const crossSpaceRead = await getProposal(apiClient, cookieHeader, id, SPACE_B);
          expect(crossSpaceRead).toHaveStatusCode(404);

          const crossSpaceRevise = await reviseProposal(
            apiClient,
            cookieHeader,
            id,
            { comment: 'revised from the wrong space' },
            SPACE_B
          );
          expect(crossSpaceRevise).toHaveStatusCode(404);

          // And the rejected attempt changed nothing in the Space A document:
          // still the root, still pending, no successor appended.
          const inOwningSpace = await getProposal(apiClient, cookieHeader, id, SPACE_A);
          expect(inOwningSpace).toHaveStatusCode(200);
          expect(inOwningSpace.body.status).toBe('pending');
          expect(inOwningSpace.body.revision).toBe(1);
          expect(inOwningSpace.body.supersededBy).toBeUndefined();
        } finally {
          for (const spaceId of [SPACE_A, SPACE_B]) {
            await kbnClient.request({ method: 'DELETE', path: `/api/spaces/space/${spaceId}` });
          }
        }
      }
    );
  }
);
