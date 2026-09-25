/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { ProposalGateFixture } from './proposal_gate_fixture';
import { createProposalGateFixture } from './proposal_gate_fixture';

const ACTION_WORKFLOW_ID = 'system-alertzero-action-create-rule';

/**
 * Drives the shipped gate workflow through the real execution engine, with
 * Elasticsearch replaced by a Map.
 *
 * The YAML-shape unit tests assert how the loop is wired; these assert what it
 * does. That distinction matters because the loop's correctness rests on engine
 * semantics a shape test cannot see — that a parked gate re-parks on a fresh
 * step execution, that `data.set` variables survive a resume, and that every
 * decision/status pair the workflow writes is one the service will accept.
 */
describe('create-investigation-proposal workflow execution', () => {
  let fixture: ProposalGateFixture;

  beforeEach(() => {
    fixture = createProposalGateFixture();
  });

  describe('parking on the gate', () => {
    it('should create an undecided proposal and wait for a human', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });

      expect(fixture.executionStatus()).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      const proposal = fixture.onlyProposal();
      expect(proposal.status).toBe('pending');
      expect(proposal.decision).toBeUndefined();
    });

    it('should record the deadline it will hold every attempt to', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });

      expect(fixture.onlyProposal().expiresAt).toEqual(expect.any(String));
    });

    it('should record the execution so approving resumes the run that created it', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });

      expect(fixture.onlyProposal().workflowExecutionId).toBe('fake_workflow_execution_id');
    });

    it('should fill the grouping and ranking fields a caller left out', async () => {
      // The caller passes only what it knows, and the YAML renders every other
      // input as `''` — Liquid has no way to omit a key. Left as empty strings
      // these reach the queue, which groups by category and silently drops
      // whatever it cannot group, so the proposal never appears at all.
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });

      const proposal = fixture.onlyProposal();
      // Resolved from the action workflow's own declared metadata, which an
      // empty-string category would have taken precedence over.
      expect(proposal.category).toBe('tune');
      expect(proposal.impact).toBe('low');
      expect(proposal.confidence).toBe('medium');
    });
  });

  describe('dismissal', () => {
    it('should settle as dismissed with no action and complete', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });

      await fixture.resume(false);

      const proposal = fixture.onlyProposal();
      expect(proposal.decision).toBe('dismissed');
      expect(proposal.status).toBe('no_action');
      expect(proposal.decidedAt).toEqual(expect.any(String));
      expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    });

    it('should attribute the dismissal to whoever answered the gate', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });

      await fixture.resume(false, 'dismissing-analyst');

      expect(fixture.onlyProposal().decidedBy?.username).toBe('dismissing-analyst');
    });
  });

  describe('approving a proposal with no action', () => {
    it('should settle as approved with no action rather than staying awaiting', async () => {
      // Approval is the whole lifecycle when there is nothing to run, so
      // without `no_action` this would sit at `pending` forever.
      await fixture.start();

      await fixture.resume(true);

      const proposal = fixture.onlyProposal();
      expect(proposal.decision).toBe('approved');
      expect(proposal.status).toBe('no_action');
      expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('an unprivileged resumer', () => {
    it('should write nothing and park again for someone who can decide', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });
      fixture.setCanDecide(false);

      await fixture.resume(true);

      // The gate is spent, but the record is untouched — which is the whole
      // reason the privilege check precedes every write.
      const proposal = fixture.onlyProposal();
      expect(proposal.decision).toBeUndefined();
      expect(proposal.status).toBe('pending');
      expect(fixture.executionStatus()).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    });

    it('should park on a new gate step execution, so a second answer can be claimed', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });
      fixture.setCanDecide(false);

      await fixture.resume(true);

      const gates = fixture.stepExecutions('await_decision', 'waitForApproval');
      expect(gates).toHaveLength(2);
      expect(gates[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(gates[1].status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    });

    it('should let a privileged approver decide the re-parked proposal', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });
      fixture.setCanDecide(false);
      await fixture.resume(true);

      fixture.setCanDecide(true);
      await fixture.resume(false, 'privileged-analyst');

      const proposal = fixture.onlyProposal();
      expect(proposal.decision).toBe('dismissed');
      expect(proposal.decidedBy?.username).toBe('privileged-analyst');
      expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    });

    it('should carry the proposal id across the park, proving variables survive a resume', async () => {
      // `data.set` is the only eviction-exempt step type, which is why the loop
      // keeps everything it carries in variables rather than step outputs.
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });
      const createdId = fixture.onlyProposal().id;
      fixture.setCanDecide(false);
      await fixture.resume(true);

      fixture.setCanDecide(true);
      await fixture.resume(false);

      expect(fixture.onlyProposal().id).toBe(createdId);
      expect(fixture.onlyProposal().decision).toBe('dismissed');
    });
  });

  describe('a proposal revised while its gate is parked', () => {
    it("runs the action against the revised actionInput, not the trigger's original", async () => {
      await fixture.start({
        actionWorkflowId: ACTION_WORKFLOW_ID,
        actionInput: { name: 'original-name' },
      });

      await fixture.revise({ actionInput: { name: 'analyst-corrected-name' } });
      await fixture.resume(true);

      const executions = fixture.stepExecutions('execute_action', 'workflow.execute');
      expect(executions).toHaveLength(1);
      // The trigger's static `inputs.actionInput` still reads `original-name`;
      // asserting on the executed step's own recorded input, not on the
      // proposal record, is what actually proves the revision reached the
      // action rather than the workflow's original static trigger input.
      const input = executions[0].input as { inputs?: { actionInput?: Record<string, unknown> } };
      expect(input?.inputs?.actionInput).toEqual({ name: 'analyst-corrected-name' });
    });

    it('marks the pre-revision proposal superseded and settles the outcome on the revision', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });
      const original = fixture.onlyProposal();

      await fixture.revise({ comment: 'clarified per analyst request' });
      await fixture.resume(true);

      const [supersededOriginal, revision] = fixture.proposals();
      expect(fixture.attachedProposalIds()).toEqual(fixture.proposals().map(({ id }) => id));
      expect(supersededOriginal.id).toBe(original.id);
      expect(supersededOriginal.status).toBe('superseded');
      expect(supersededOriginal.supersededBy).toBe(revision.id);
      expect(revision.decision).toBe('approved');
    });
  });

  describe('an external resume', () => {
    // Carries no request, so the engine wakes the pre-scheduled task under the
    // workflow runner's own API key. That identity always holds
    // `manage_proposals` — it had to, to create the proposal — so checking it
    // would authorize every click on a magic link as the Worker, and record the
    // Worker as the decider.
    const EXTERNAL_PRINCIPAL = 'external_resume:step-exec-1';

    it('should be refused and re-parked rather than decided as the Worker', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });

      await fixture.resume(true, EXTERNAL_PRINCIPAL);

      const proposal = fixture.onlyProposal();
      expect(proposal.decision).toBeUndefined();
      expect(proposal.status).toBe('pending');
      expect(fixture.executionStatus()).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    });

    it('should be refused even though the execution identity is privileged', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });
      // Privileges are wide open, so only the responder check can refuse this.
      fixture.setCanDecide(true);

      await fixture.resume(true, EXTERNAL_PRINCIPAL);

      expect(fixture.onlyProposal().decision).toBeUndefined();
    });

    it('should still let an authenticated approver decide afterwards', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });
      await fixture.resume(true, EXTERNAL_PRINCIPAL);

      await fixture.resume(false, 'analyst');

      const proposal = fixture.onlyProposal();
      expect(proposal.decision).toBe('dismissed');
      expect(proposal.decidedBy?.username).toBe('analyst');
    });
  });

  describe('a failing action', () => {
    // The action workflow does not exist in this harness, so `workflow.execute`
    // fails — which is the branch worth exercising, because a successful action
    // needs no recovery.
    it('should settle the attempt as approved and failed', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });

      await fixture.resume(true);

      const failed = fixture.proposals()[0];
      expect(failed.decision).toBe('approved');
      expect(failed.status).toBe('failed');
      expect(failed.executionError).toEqual(expect.any(String));
    });

    it('should re-offer the subject as a fresh proposal and park again', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });

      await fixture.resume(true);

      const [original, clone] = fixture.proposals();
      expect(fixture.attachedProposalIds()).toEqual([original.id, clone.id]);
      expect(clone).toBeDefined();
      expect(original.supersededBy).toBe(clone.id);
      expect(clone.decision).toBeUndefined();
      expect(clone.status).toBe('pending');
      expect(fixture.executionStatus()).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    });

    it('should inherit the deadline so a chain of retries cannot outlive it', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });

      await fixture.resume(true);

      const [original, clone] = fixture.proposals();
      expect(clone.expiresAt).toBe(original.expiresAt);
      expect(clone.createdAt).toBe(original.createdAt);
    });

    it('should point the clone at the same parked execution', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });

      await fixture.resume(true);

      const [, clone] = fixture.proposals();
      expect(clone.workflowExecutionId).toBe('fake_workflow_execution_id');
    });

    it('should let the clone be dismissed on the next answer', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID });
      await fixture.resume(true);

      await fixture.resume(false);

      const [original, clone] = fixture.proposals();
      // The original keeps the outcome it already settled on.
      expect(original.status).toBe('failed');
      expect(clone.decision).toBe('dismissed');
      expect(clone.status).toBe('no_action');
      expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('a gate nobody answers', () => {
    it('should settle as expired once the gate times out', async () => {
      await fixture.start();
      await fixture.timeOutGate();

      const proposal = fixture.onlyProposal();
      expect(proposal.status).toBe('expired');
      // Nobody answered, so there is no decision to record — `expired` is the
      // only terminal status an undecided proposal has.
      expect(proposal.decision).toBeUndefined();
      expect(proposal.decidedBy).toBeUndefined();
    });

    it('should complete rather than fail, since a timeout is an expected end', async () => {
      await fixture.start();
      await fixture.timeOutGate();

      // The step-level handler on the gate is what makes this `completed`:
      // without it the workflow-level handler settles the record but ends the
      // run as `failed` and skips the output step.
      expect(fixture.executionStatus()).toBe(ExecutionStatus.COMPLETED);
    });

    it('should not read a timed-out gate as a dismissal', async () => {
      await fixture.start();
      await fixture.timeOutGate();

      // A timed-out gate answers blank, which the dismissal branch would
      // otherwise record as a decision nobody made.
      expect(fixture.onlyProposal().dismissReason).toBeUndefined();
      expect(fixture.stepExecutions('record_dismissal')).toHaveLength(0);
    });

    it('should carry the timeout onto the record, so the queue can say why', async () => {
      await fixture.start();
      await fixture.timeOutGate();

      expect(fixture.onlyProposal().executionError).toContain('timeout');
    });
  });

  describe('autonomy', () => {
    it('should skip the gate for an action the caller already authorised', async () => {
      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID, autoApprove: true });

      // Never parked: the first proposal was decided without a human, and its
      // action failed, so it was re-offered — this time gated.
      const [first] = fixture.proposals();
      expect(first.decision).toBe('approved');
      expect(fixture.stepExecutions('await_decision', 'waitForApproval')).toHaveLength(1);
      expect(fixture.executionStatus()).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    });

    it('should still gate a proposal with no action, whatever the flag says', async () => {
      await fixture.start({ autoApprove: true });

      // Approval is the entire lifecycle here, so there is no autonomy to
      // resolve and the flag is deliberately ignored.
      expect(fixture.executionStatus()).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      expect(fixture.onlyProposal().decision).toBeUndefined();
    });

    it('should still gate an always-gate action the caller tried to authorise', async () => {
      fixture.setActionMetadata({
        name: 'Create rule',
        category: 'tune',
        approvalPolicy: 'always-gate',
      });

      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID, autoApprove: true });

      // The action's own declaration outranks whatever autonomy the caller
      // resolved, so a Worker cannot auto-approve it by mistake.
      expect(fixture.executionStatus()).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      expect(fixture.onlyProposal().decision).toBeUndefined();
    });

    it('should gate when the action metadata could not be read at all', async () => {
      fixture.failActionLookup();

      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID, autoApprove: true });

      // Creation swallows the read failure, so an unreadable policy is
      // indistinguishable from a permissive one — a transient outage must not
      // be what lets an action run unattended.
      expect(fixture.executionStatus()).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      expect(fixture.onlyProposal().decision).toBeUndefined();
    });

    it('should skip the gate for an autonomy-dependent action', async () => {
      fixture.setActionMetadata({
        name: 'Create rule',
        category: 'tune',
        approvalPolicy: 'autonomy-dependent',
      });

      await fixture.start({ actionWorkflowId: ACTION_WORKFLOW_ID, autoApprove: true });

      // Declaring the policy explicitly must behave like declaring nothing;
      // only `always-gate` overrides the caller.
      expect(fixture.proposals()[0].decision).toBe('approved');
    });
  });
});
