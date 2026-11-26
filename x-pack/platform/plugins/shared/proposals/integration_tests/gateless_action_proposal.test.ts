/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalConflictError } from '../server/services/errors';
import type { ProposalGateFixture } from './proposal_gate_fixture';
import { createProposalGateFixture } from './proposal_gate_fixture';

const ACTION_WORKFLOW_ID = 'system-alertzero-action-create-rule';

/**
 * Approves a gateless action proposal through the real service, which starts
 * the shipped `system-resolve-proposal` workflow on the real execution engine,
 * with Elasticsearch replaced by a Map.
 *
 * The point is the hand-off: the service has to leave the proposal in a state
 * the resolve workflow's own writes are accepted on, and has to follow up on a
 * run that ends without deciding it.
 */
describe('gateless action proposal approval', () => {
  let fixture: ProposalGateFixture;

  beforeEach(() => {
    fixture = createProposalGateFixture();
  });

  it('decides the proposal through the resolve workflow, attributed to the approver', async () => {
    const { id } = await fixture.seedGatelessProposal({ actionWorkflowId: ACTION_WORKFLOW_ID });

    await fixture.releaseGate(id, true);

    // The action workflow does not exist in this harness, so the run fails it —
    // after it has written the decision, which is what this asserts.
    const proposal = fixture.onlyProposal();
    expect(proposal).toMatchObject({
      gate: 'none',
      decision: 'approved',
      decisionMode: 'manual',
      status: 'failed',
    });
    expect(proposal.decidedBy?.username).toBe('analyst');
    expect(proposal.executionError).toEqual(expect.any(String));
    expect(proposal.resolveExecutionId).toBe('resolve-proposal-1');
  });

  it('runs the action with the approved input and settles the proposal as succeeded', async () => {
    const actionInputs = fixture.succeedAction(ACTION_WORKFLOW_ID);
    const { id } = await fixture.seedGatelessProposal({
      actionWorkflowId: ACTION_WORKFLOW_ID,
      actionInput: { ruleId: 'rule-1' },
    });

    await fixture.releaseGate(id, true);

    expect(actionInputs()).toEqual([{ actionInput: { ruleId: 'rule-1' } }]);
    const proposal = fixture.onlyProposal();
    expect(proposal).toMatchObject({
      decision: 'approved',
      decisionMode: 'manual',
      status: 'succeeded',
      resolveExecutionId: 'resolve-proposal-1',
    });
    expect(proposal.executionError).toBeUndefined();
  });

  it('records no clone: a gateless proposal has no gate to re-offer it on', async () => {
    const { id } = await fixture.seedGatelessProposal({ actionWorkflowId: ACTION_WORKFLOW_ID });

    await fixture.releaseGate(id, true);

    expect(fixture.proposals()).toHaveLength(1);
    expect(fixture.onlyProposal().supersededBy).toBeUndefined();
  });

  describe('an approver the resolve workflow refuses', () => {
    let id: string;

    beforeEach(async () => {
      ({ id } = await fixture.seedGatelessProposal({ actionWorkflowId: ACTION_WORKFLOW_ID }));
      fixture.setCanDecide(false);
      await fixture.releaseGate(id, true);
    });

    it('leaves the proposal undecided', () => {
      const proposal = fixture.onlyProposal();
      expect(proposal.decision).toBeUndefined();
      expect(proposal.status).toBe('pending');
    });

    it('lifts the release mark on the next read, rather than expiring the proposal', async () => {
      const proposal = await fixture.get(id);

      expect(proposal.status).toBe('pending');
      expect(proposal.gateReleasedAt).toBeUndefined();
      expect(proposal.resolveExecutionId).toBeUndefined();
    });

    it('lets a privileged approver decide it afterwards', async () => {
      fixture.setCanDecide(true);

      await fixture.releaseGate(id, true);

      expect(fixture.onlyProposal()).toMatchObject({
        decision: 'approved',
        status: 'failed',
        resolveExecutionId: 'resolve-proposal-2',
      });
    });
  });

  it('refuses a second decision once the first has landed', async () => {
    const { id } = await fixture.seedGatelessProposal({ actionWorkflowId: ACTION_WORKFLOW_ID });
    await fixture.releaseGate(id, true);

    await expect(fixture.releaseGate(id, false)).rejects.toBeInstanceOf(ProposalConflictError);
  });

  it('dismisses directly, starting no workflow', async () => {
    const { id } = await fixture.seedGatelessProposal({ actionWorkflowId: ACTION_WORKFLOW_ID });

    await fixture.releaseGate(id, false);

    expect(fixture.onlyProposal()).toMatchObject({ decision: 'dismissed', status: 'no_action' });
    expect(fixture.stepExecutions('check_privileges')).toHaveLength(0);
  });
});
