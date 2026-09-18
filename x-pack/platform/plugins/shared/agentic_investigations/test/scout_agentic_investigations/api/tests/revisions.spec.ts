/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import {
  apiTest,
  getProposal,
  PROPOSALS_MANAGE_ROLE,
  PROPOSALS_READ_ONLY_ROLE,
  seedProposal,
  reviseProposal,
} from '../fixtures';

apiTest.describe(
  'POST /internal/investigations/proposals/{proposalId}/revisions',
  { tag: [...tags.stateful.classic] },
  () => {
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

        // Deliberately NOT asserted: workflow resumption. Per elastic/security-team#19289,
        // revising must not release the parked `waitForApproval` gate — there is no
        // workflow side effect to observe here; that omission is covered by unit tests
        // on `ProposalsService.revise()` rather than this end-to-end path.
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
        expect(firstRevise).toHaveStatusCode(200);
        const secondId = firstRevise.body.proposalId;
        expect(firstRevise.body.revision).toBe(2);

        const secondRevise = await reviseProposal(apiClient, cookieHeader, secondId, {
          comment: 'revision 3',
        });
        expect(secondRevise).toHaveStatusCode(200);
        const thirdId = secondRevise.body.proposalId;
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
        // Seeded directly as settled: there is no real workflow execution
        // behind this proposal for the dismiss/approve routes to resume, so
        // going through them here would 409 on the resume itself rather than
        // exercising what this test actually checks.
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
  }
);
