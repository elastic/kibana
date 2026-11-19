/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

/**
 * Advanced integration tests for output retention.
 *
 * The cache budget is 1 byte, so an output is not kept in the LRU. Resume is the
 * boundary that drops it: `load()` omits outputs, and the next read fetches the
 * ones that node names.
 *
 * 1. on-failure:continue — a failed step stores null. After resume the consumer
 *    still completes, and the completed predecessor is fetched.
 * 2. if/then/else — `prepareContext` loads the taken branch. The else branch
 *    never ran, so it has no execution to fetch.
 * 3. on-failure:retry — the first attempt succeeds, so there is no failed
 *    attempt. After resume the consumer fetches the outputs it names.
 */

// ---------------------------------------------------------------------------
// Suite 1: on-failure:continue + eviction — failed step must not corrupt eviction state
// ---------------------------------------------------------------------------
describe('output eviction: on-failure:continue does not corrupt eviction state', () => {
  let fixture: WorkflowRunFixture;

  // Workflow:
  //   step_large (20KB) → step_fail (constantlyFailing, continue:true) →
  //   pause (wait: 20m) → step_consumer (references both step_large and step_fail outputs)
  //
  // The 1-byte cache does not keep step_large. step_fail stores null.
  // After resume, step_consumer fetches step_large.
  const yaml = `
name: continue-eviction-interaction
enabled: false
triggers:
  - type: manual
steps:
  - name: step_large
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 20000

  - name: step_fail
    type: slack
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      continue: true
    with:
      message: 'This will fail'

  - name: pause
    type: wait
    with:
      duration: 20m

  - name: step_consumer
    type: console
    with:
      message: 'large size {{steps.step_large.output.payload | size}}, fail output {{steps.step_fail.output}}'
`;

  describe('phase 1: initial run pauses at wait step', () => {
    beforeAll(async () => {
      fixture = new WorkflowRunFixture();
      (fixture.configMock as Record<string, unknown>).eviction = {
        maxCacheSize: new ByteSizeValue(1),
      };
      await fixture.runWorkflow({ workflowYaml: yaml });
    });

    it('should pause at wait step (on-failure:continue absorbed the failure)', () => {
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.WAITING);
      expect(exec?.error).toBeUndefined();
    });

    it('step_fail is FAILED; step_large is COMPLETED; pause step is WAITING', () => {
      const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
      expect(steps.find((s) => s.stepId === 'step_fail')?.status).toBe(ExecutionStatus.FAILED);
      expect(steps.find((s) => s.stepId === 'step_large')?.status).toBe(ExecutionStatus.COMPLETED);
      expect(steps.find((s) => s.stepId === 'pause')?.status).toBe(ExecutionStatus.WAITING);
    });

    it('step_fail output in ES is null', () => {
      const stepFail = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).find(
        (s) => s.stepId === 'step_fail'
      );
      // The mock repository simulates ES: null output stored there = no output was ever produced
      expect(stepFail?.output).toBeNull();
    });
  });

  describe('phase 2: resume completes workflow via targeted rehydration', () => {
    let getByIdsSpy: jest.SpyInstance;

    beforeAll(async () => {
      getByIdsSpy = jest.spyOn(fixture.stepExecutionRepositoryMock, 'getStepExecutionsByIds');
      await fixture.resumeWorkflowAtScheduledTime();
    });

    it('should complete workflow after resume', () => {
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.COMPLETED);
      expect(exec?.error).toBeUndefined();
    });

    it('step_consumer completed — rehydrated step_large output successfully', () => {
      const stepConsumer = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_consumer');
      expect(stepConsumer?.status).toBe(ExecutionStatus.COMPLETED);
      // console step returns its rendered message as output; step_large produced 20000 bytes
      expect(stepConsumer?.output as string).toContain('20000');
    });

    it('step_large was rehydrated (it is referenced in step_consumer template and was evicted on load)', () => {
      const stepLargeExec = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_large');

      const rehydrationCalls = getByIdsSpy.mock.calls.filter(
        (call) => Array.isArray(call[1]) && call[1].includes('output')
      );
      expect(rehydrationCalls.length).toBeGreaterThan(0);
      const rehydratedIds = rehydrationCalls.flatMap((call) => call[0] as string[]);
      expect(rehydratedIds).toContain(stepLargeExec?.id);
    });

    it('step_fail output remains null after resume', () => {
      // Resume fetches step_fail because the consumer names it, and Elasticsearch
      // still has null. Null is the failed step's output.
      const stepFailExec = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_fail');
      // The repository (simulating ES) still has null output — rehydration did not corrupt it
      expect(stepFailExec?.output).toBeNull();
      // The workflow completed without errors despite step_fail's null output being in context
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.COMPLETED);
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 2: if/then/else + eviction + resume
// ---------------------------------------------------------------------------
describe('output eviction: if/then/else branch + eviction + resume', () => {
  let fixture: WorkflowRunFixture;

  // Workflow:
  //   setup_step (20KB) → if (condition references setup_step.output) →
  //     then: then_step (slack)   |   else: else_step (slack, skipped)
  //   → pause (wait: 20m) → final_step (references setup_step AND then_step outputs)
  //
  // On resume:
  //   - load() marks all non-data.set steps as evicted
  //   - prepareContext() for final_step must load setup_step and then_step
  //   - else_step never executed → not in eviction state → no crash
  const yaml = `
name: if-branch-eviction-resume
enabled: false
triggers:
  - type: manual
steps:
  - name: setup_step
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 20000

  - name: cond
    type: if
    condition: 'steps.setup_step.output.payload:*'
    steps:
      - name: then_step
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'Condition true — setup payload is present'
    else:
      - name: else_step
        type: slack
        connector-id: ${FakeConnectors.slack2.name}
        with:
          message: 'Condition false — should never execute'

  - name: pause
    type: wait
    with:
      duration: 20m

  - name: final_step
    type: console
    with:
      message: 'setup size {{steps.setup_step.output.payload | size}}, then output {{steps.then_step.output.text}}'
`;

  describe('phase 1: initial run — correct branch taken, pauses at wait', () => {
    beforeAll(async () => {
      fixture = new WorkflowRunFixture();
      (fixture.configMock as Record<string, unknown>).eviction = {
        maxCacheSize: new ByteSizeValue(1),
      };
      await fixture.runWorkflow({ workflowYaml: yaml });
    });

    it('should pause at wait step', () => {
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.WAITING);
    });

    it('setup_step and then_step completed; else_step never executed', () => {
      const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
      expect(steps.find((s) => s.stepId === 'setup_step')?.status).toBe(ExecutionStatus.COMPLETED);
      expect(steps.find((s) => s.stepId === 'then_step')?.status).toBe(ExecutionStatus.COMPLETED);
      // else_step must NOT have run — its output would indicate wrong branch was taken
      expect(steps.find((s) => s.stepId === 'else_step')).toBeUndefined();
    });
  });

  describe('phase 2: resume — targeted rehydration for final_step', () => {
    let getByIdsSpy: jest.SpyInstance;

    beforeAll(async () => {
      getByIdsSpy = jest.spyOn(fixture.stepExecutionRepositoryMock, 'getStepExecutionsByIds');
      await fixture.resumeWorkflowAtScheduledTime();
    });

    it('should complete workflow successfully after resume', () => {
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.COMPLETED);
      expect(exec?.error).toBeUndefined();
    });

    it('final_step completed', () => {
      const finalStep = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'final_step');
      expect(finalStep?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('resume load() fetched steps with output excluded (memory optimization)', () => {
      // The first call to getStepExecutionsByIds is from load(), which uses sourceExcludes: ['output']
      const loadCall = getByIdsSpy.mock.calls[0];
      expect(loadCall[1]).toBeUndefined(); // sourceIncludes: undefined
      expect(loadCall[2]).toEqual(['output']); // sourceExcludes: ['output']
    });

    it('setup_step and then_step were rehydrated for final_step', () => {
      const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
      const setupStepExec = steps.find((s) => s.stepId === 'setup_step');
      const thenStepExec = steps.find((s) => s.stepId === 'then_step');

      const rehydrationCalls = getByIdsSpy.mock.calls.filter(
        (call) => Array.isArray(call[1]) && call[1].includes('output')
      );
      expect(rehydrationCalls.length).toBeGreaterThan(0);

      const rehydratedIds = rehydrationCalls.flatMap((call) => call[0] as string[]);
      expect(rehydratedIds).toContain(setupStepExec?.id);
      expect(rehydratedIds).toContain(thenStepExec?.id);
    });

    it('else_step execution ID does not appear in any rehydration call (it was never created)', () => {
      // else_step was never executed → no execution record exists → cannot be in rehydration list
      const elseStepExec = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'else_step');
      expect(elseStepExec).toBeUndefined();

      // No rehydration call can reference a non-existent step — engine should not crash
      const rehydrationCalls = getByIdsSpy.mock.calls.filter(
        (call) => Array.isArray(call[1]) && call[1].includes('output')
      );
      // Verify the workflow completed without referencing the non-existent else_step
      expect(rehydrationCalls.length).toBeGreaterThan(0);
    });

    it('final_step output proves setup_step payload was successfully rehydrated (non-zero size)', () => {
      const finalStep = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'final_step');
      // console step output = rendered message; 20000 chars → size filter returns 20000
      expect(finalStep?.output as string).toContain('20000');
    });
  });
});

// ---------------------------------------------------------------------------
// Suite 3: on-failure:retry + eviction boundary + targeted rehydration on resume
// ---------------------------------------------------------------------------
describe('output eviction: on-failure:retry + eviction boundary + targeted rehydration on resume', () => {
  let fixture: WorkflowRunFixture;

  // Workflow:
  //   step_large (20KB, IS evicted) → step_small (slack1, ~50 bytes, NOT evicted) →
  //   step_retry_target (slack1, retries 2x with 1s delay, template references step_large only) →
  //   pause (wait: 20m) → step_consumer (references step_large and step_retry_target outputs)
  //
  // The retry always succeeds on attempt 1 (slack1 = success connector), so retries won't fire.
  // The pause is what creates the eviction boundary.
  //
  // Key invariants tested:
  //   - step_large is fetched on resume because the consumer names it
  //   - step_small's stored output is intact
  //   - the retry target succeeds on the first attempt, so there is no failed attempt
  const yaml = `
name: retry-eviction-boundary-resume
enabled: false
triggers:
  - type: manual
steps:
  - name: step_large
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: 20000

  - name: step_small
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'small step output'

  - name: step_retry_target
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    on-failure:
      retry:
        max-attempts: 2
        delay: 1s
    with:
      message: 'Referencing large output: {{steps.step_large.output.payload | truncate: 20}}'

  - name: pause
    type: wait
    with:
      duration: 20m

  - name: step_consumer
    type: console
    with:
      message: 'large size {{steps.step_large.output.payload | size}}, small {{steps.step_small.output}}'
`;

  describe('phase 1: initial run pauses at wait step', () => {
    beforeAll(async () => {
      fixture = new WorkflowRunFixture();
      (fixture.configMock as Record<string, unknown>).eviction = {
        maxCacheSize: new ByteSizeValue(1),
      };
      await fixture.runWorkflow({ workflowYaml: yaml });
    });

    it('should pause at wait step', () => {
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.WAITING);
    });

    it('all pre-pause steps are COMPLETED', () => {
      const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
      expect(steps.find((s) => s.stepId === 'step_large')?.status).toBe(ExecutionStatus.COMPLETED);
      expect(steps.find((s) => s.stepId === 'step_small')?.status).toBe(ExecutionStatus.COMPLETED);
      // step_retry_target: slack1 always succeeds, so there is exactly 1 completed execution
      const retryAttempts = steps.filter(
        (s) => s.stepId === 'step_retry_target' && s.stepType === FakeConnectors.slack1.actionTypeId
      );
      expect(retryAttempts.length).toBe(1);
      expect(retryAttempts[0].status).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('phase 2: resume — eviction boundary validates targeted rehydration', () => {
    let getByIdsSpy: jest.SpyInstance;

    beforeAll(async () => {
      getByIdsSpy = jest.spyOn(fixture.stepExecutionRepositoryMock, 'getStepExecutionsByIds');
      await fixture.resumeWorkflowAtScheduledTime();
    });

    it('should complete workflow after resume', () => {
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.COMPLETED);
      expect(exec?.error).toBeUndefined();
    });

    it('step_consumer completed using rehydrated step_large output (non-zero size)', () => {
      const stepConsumer = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_consumer');
      expect(stepConsumer?.status).toBe(ExecutionStatus.COMPLETED);
      // 20000 chars in payload → size filter returns 20000
      expect(stepConsumer?.output as string).toContain('20000');
    });

    it('step_large was fetched because the consumer names it', () => {
      const stepLargeExec = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_large');

      const rehydrationCalls = getByIdsSpy.mock.calls.filter(
        (call) => Array.isArray(call[1]) && call[1].includes('output')
      );
      expect(rehydrationCalls.length).toBeGreaterThan(0);
      const rehydratedIds = rehydrationCalls.flatMap((call) => call[0] as string[]);
      expect(rehydratedIds).toContain(stepLargeExec?.id);
    });

    it('step_small output is intact after resume', () => {
      // Resume omits every output, whatever its size. step_small is still stored
      // in Elasticsearch, and the consumer can read it.
      const stepSmallExec = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((s) => s.stepId === 'step_small');
      // step_small output is present in ES (was never stripped by live-execution eviction)
      expect(stepSmallExec?.output).toBeDefined();
      // The workflow completed correctly despite step_small being rehydrated from ES
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.COMPLETED);
    });
  });
});
