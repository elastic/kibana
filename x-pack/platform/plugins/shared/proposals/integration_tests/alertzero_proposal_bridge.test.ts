/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/test_helpers';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import { z } from '@kbn/zod/v4';

/**
 * The bridge forwards its own trigger inputs on to the gate, which no other
 * managed workflow does — every other `workflow.execute` passes literals or
 * already-resolved step outputs. That hop is the part a YAML test cannot reach:
 * `{{ }}` renders an absent input as `''`, which the gate's trigger rejects for
 * `autoApprove` (boolean) and `actionInput` (object), failing the run over a
 * field the caller simply did not set. Only executing the step shows what the
 * gate would actually receive.
 *
 * The child is never resolved here — the harness has no workflow registry, so
 * `workflow.execute` fails on lookup — but the engine records the rendered
 * inputs before it gets that far, which is the whole contract under test.
 * Output relay and the WAITING_FOR_CHILD resume still need a harness that can
 * run a real child.
 */
const bridgeYaml = (): string => {
  const definition = getManagedWorkflowDefinition(ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID);
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error(`Managed definition ${ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID} has no yaml`);
  }
  return definition.yaml;
};

// A stand-in for the agenticInvestigations step, which this plugin cannot
// import: only its `reopened` output matters to the forward.
const REOPEN_STEP_ID = 'investigations.reopen';
const reopenStep = (reopened: boolean) =>
  createServerStepDefinition({
    id: REOPEN_STEP_ID,
    category: StepCategory.Kibana,
    label: 'Reopen investigation (stub)',
    description: 'Reports a fixed reopened flag',
    inputSchema: z.object({ conversationId: z.string() }),
    outputSchema: z.object({ reopened: z.boolean(), title: z.string() }),
    handler: async () => ({ output: { reopened, title: 'Investigation' } }),
  });

const runBridge = async (inputs: Record<string, unknown>, { reopened = false } = {}) => {
  const engine = new WorkflowRunFixture();
  const { getStepDefinition, hasStepDefinition } = engine.dependencies.workflowsExtensions;
  (getStepDefinition as jest.Mock).mockImplementation((id: string) =>
    id === REOPEN_STEP_ID ? reopenStep(reopened) : undefined
  );
  (hasStepDefinition as jest.Mock).mockImplementation((id: string) => id === REOPEN_STEP_ID);
  await engine.runWorkflow({ workflowYaml: bridgeYaml(), inputs });

  const [execution] = [...engine.stepExecutionRepositoryMock.stepExecutions.values()].filter(
    (step) => step.stepId === 'create_proposal' && step.stepType === 'workflow.execute'
  );
  if (!execution) {
    throw new Error('The bridge never reached its forwarding step');
  }
  return (execution.input as { inputs?: Record<string, unknown> }).inputs ?? {};
};

const MINIMAL_INPUTS = { conversationId: 'conv-1', comment: 'Tune the noisy rule' };

describe('system-create-alertzero-proposal forwarding', () => {
  it('supplies the origin the caller cannot set', async () => {
    await expect(runBridge(MINIMAL_INPUTS)).resolves.toMatchObject({ origin: 'alertzero' });
  });

  it('passes the caller values it was given straight through', async () => {
    const forwarded = await runBridge({
      ...MINIMAL_INPUTS,
      title: 'Tune noisy rule',
      actionInput: { ruleId: 'rule-1', nested: { enabled: true } },
      autoApprove: true,
    });

    expect(forwarded.conversationId).toBe('conv-1');
    expect(forwarded.title).toBe('Tune noisy rule');
    // Types survive the hop: the gate declares these `object` and `boolean`.
    expect(forwarded.actionInput).toEqual({ ruleId: 'rule-1', nested: { enabled: true } });
    expect(forwarded.autoApprove).toBe(true);
  });

  // The failure this is really guarding: `''` reaching a `boolean` or `object`
  // field fails the gate's trigger validation, so an omitted optional input
  // would take down a run that has nothing wrong with it.
  it.each(['actionInput', 'title', 'impact', 'confidence', 'expiresIn'])(
    'leaves an omitted %s unset rather than blank',
    async (field) => {
      const forwarded = await runBridge(MINIMAL_INPUTS);

      expect(forwarded[field]).toBeUndefined();
      expect(forwarded[field]).not.toBe('');
    }
  );

  // `autoApprove` is the one forward that is computed rather than passed
  // through, so an omitted one arrives as a real boolean, never `''`.
  describe('autoApprove', () => {
    it('forwards false when the caller omits it', async () => {
      await expect(runBridge(MINIMAL_INPUTS)).resolves.toMatchObject({ autoApprove: false });
    });

    it('forwards the caller value when the investigation was already open', async () => {
      await expect(
        runBridge({ ...MINIMAL_INPUTS, autoApprove: true }, { reopened: false })
      ).resolves.toMatchObject({ autoApprove: true });
    });

    it('forwards false when the investigation had to be reopened, even if the caller asked for true', async () => {
      await expect(
        runBridge({ ...MINIMAL_INPUTS, autoApprove: true }, { reopened: true })
      ).resolves.toMatchObject({ autoApprove: false });
    });
  });
});
