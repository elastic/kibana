/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step-output reads across a flush, including paths the static template scanner used to miss.
 *
 * After flush, outputs leave the live map. `prepareContext` only loads ids the scanner names
 * (or every predecessor when analysis returns `null`). A miss leaves the consumer blank even
 * if the LRU still holds the value, because the snapshot never asks for that id.
 *
 * Each workflow has a small (100 byte) producer output and a `wait` of 1s between producer and
 * consumer. The persistence loop flushes every 500ms, so at least one flush lands between the
 * two steps. The `wait` is short enough to run inline: one process, no resume, no cold cache.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const buildYaml = (reference: string, producerName: string) => `
name: unpredicted-read
enabled: false
triggers:
  - type: manual
steps:
  - name: ${producerName}
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 100

  - name: let_flush_run
    type: wait
    with:
      duration: 1s

  - name: consume
    type: console
    with:
      message: '${reference}'
`;

const runAndGetConsumerOutput = async (reference: string, producerName = 'produce') => {
  const fixture = new WorkflowRunFixture();
  await fixture.runWorkflow({ workflowYaml: buildYaml(reference, producerName) });

  const execution = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
    'fake_workflow_execution_id'
  );
  const consumer = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).find(
    (step) => step.stepId === 'consume'
  );
  return { execution, consumer };
};

describe('StepIoService (LRU): reads across a flush', () => {
  // Control: `steps.produce` is recognised by the scanner, so the output is pre-loaded.
  it('renders a dot reference after a flush', async () => {
    const { execution, consumer } = await runAndGetConsumerOutput(
      '{{ steps.produce.output.payload | slice: 0, 3 }}'
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(consumer?.status).toBe(ExecutionStatus.COMPLETED);
    expect(consumer?.output).toBe('xxx');
  });

  // Control: the scanner normalises literal bracket references to `steps.produce`.
  it('renders a literal bracket reference after a flush', async () => {
    const { execution, consumer } = await runAndGetConsumerOutput(
      '{{ steps["produce"].output.payload | slice: 0, 3 }}'
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(consumer?.status).toBe(ExecutionStatus.COMPLETED);
    expect(consumer?.output).toBe('xxx');
  });

  // A step name with a dot can only be referenced with brackets. Liquid keeps
  // `steps['my.produce']` (does not rewrite to dots); the scanner must extract the full id.
  it('renders a bracket reference to a dotted step name after a flush', async () => {
    const { execution, consumer } = await runAndGetConsumerOutput(
      '{{ steps["my.produce"].output.payload | slice: 0, 3 }}',
      'my.produce'
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(consumer?.status).toBe(ExecutionStatus.COMPLETED);
    expect(consumer?.output).toBe('xxx');
  });

  // Control for the case above: same step name, same flush, same bracket reference. A dynamic
  // `steps[k]` access in the template makes the scanner give up (`null`), which pre-loads every
  // predecessor. Only the prediction differs, so a pass here points at the prepared set.
  it('renders the dotted step name when a dynamic access forces the predecessor fallback', async () => {
    const { execution, consumer } = await runAndGetConsumerOutput(
      '{% assign k = "none" %}{{ steps[k].output }}{{ steps["my.produce"].output.payload | slice: 0, 3 }}',
      'my.produce'
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(consumer?.status).toBe(ExecutionStatus.COMPLETED);
    expect(consumer?.output).toBe('xxx');
  });
});

// ---------------------------------------------------------------------------
// A step after a switch join that rebuilds the executed branch's step name from the
// same expression the switch evaluated, then reads that step's output.
//
// `steps[k]` is a dynamic access, so the scanner cannot name the step and the context
// falls back to every predecessor. Branch steps that did not run have no execution and
// are skipped. The `wait` lets a flush land between the branch and the reader.
// ---------------------------------------------------------------------------
describe('StepIoService (LRU): reading the executed switch branch after the join', () => {
  const switchYaml = `
name: switch-join-reuse
enabled: false
triggers:
  - type: manual
steps:
  - name: choose
    type: data.set
    with:
      route: __ROUTE__

  - name: route_switch
    type: switch
    expression: '{{ variables.route }}'
    cases:
      - match: alpha
        steps:
          - name: branch_alpha
            type: console
            with:
              message: 'alpha-ran'
      - match: beta
        steps:
          - name: branch_beta
            type: console
            with:
              message: 'beta-ran'
    default:
      - name: branch_gamma
        type: console
        with:
          message: 'gamma-ran'

  - name: let_flush_run
    type: wait
    with:
      duration: 1s

  - name: after_join
    type: console
    with:
      message: '{% assign k = "branch_" | append: variables.route %}{{ steps[k].output }}'
`;

  it.each([
    ['alpha', 'alpha-ran'],
    ['beta', 'beta-ran'],
    ['gamma', 'gamma-ran'], // no matching case: the default branch runs
  ])('route "%s" renders the output of the branch that ran', async (route, expectedOutput) => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: switchYaml.replace('__ROUTE__', route) });

    const execution = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
    const executedBranches = steps
      .filter((step) => step.stepId.startsWith('branch_'))
      .map((step) => step.stepId);
    const afterJoin = steps.find((step) => step.stepId === 'after_join');

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    // Only the selected branch ran.
    expect(executedBranches).toEqual([`branch_${route}`]);
    expect(afterJoin?.status).toBe(ExecutionStatus.COMPLETED);
    expect(afterJoin?.output).toBe(expectedOutput);
  });
});
