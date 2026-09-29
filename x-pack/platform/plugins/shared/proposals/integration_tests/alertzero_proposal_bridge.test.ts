/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/test_helpers';
import {
  ALERTZERO_CREATE_PROPOSAL_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';

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

const runBridge = async (inputs: Record<string, unknown>) => {
  const engine = new WorkflowRunFixture();
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
  it.each(['autoApprove', 'actionInput', 'title', 'impact', 'confidence', 'expiresIn'])(
    'leaves an omitted %s unset rather than blank',
    async (field) => {
      const forwarded = await runBridge(MINIMAL_INPUTS);

      expect(forwarded[field]).toBeUndefined();
      expect(forwarded[field]).not.toBe('');
    }
  );
});
