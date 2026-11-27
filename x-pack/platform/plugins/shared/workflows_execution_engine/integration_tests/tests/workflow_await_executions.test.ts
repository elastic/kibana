/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsWorkflow, EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus, WorkflowRepository } from '@kbn/workflows';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const PARENT_EXECUTION_ID = 'fake_workflow_execution_id';

const FAN_OUT_YAML = `
steps:
  - name: enrich_hosts
    type: workflow.executeAsync
    with:
      workflow-id: child-workflow
  - name: enrich_users
    type: workflow.executeAsync
    with:
      workflow-id: child-workflow
  - name: join
    type: workflow.awaitExecutions
    timeout: 5m
    with:
      execution-ids:
        - "{{ steps.enrich_hosts.output.executionId }}"
        - "{{ steps.enrich_users.output.executionId }}"
`;

const PARALLEL_FAN_OUT_YAML = `
steps:
  - name: fan_out
    type: parallel
    foreach: '["host-a", "host-b", "host-c"]'
    steps:
      - name: scan_host
        type: workflow.executeAsync
        with:
          workflow-id: child-workflow
          inputs:
            host: "{{ foreach.item }}"
  - name: join
    type: workflow.awaitExecutions
    with:
      from-steps: [fan_out]
      mode: settled
`;

const PER_BRANCH_JOIN_YAML = `
steps:
  - name: fan_out
    type: parallel
    foreach: '["host-a", "host-b", "host-c"]'
    steps:
      - name: scan_host
        type: workflow.executeAsync
        with:
          workflow-id: child-workflow
      - name: join
        type: workflow.awaitExecutions
        with:
          from-steps: [scan_host]
`;

describe('workflow.awaitExecutions', () => {
  let fixture: WorkflowRunFixture;
  const now = new Date('2026-11-18T12:00:00.000Z');

  const children = (count = 2) =>
    Array.from({ length: count }, (_, index) =>
      fixture.workflowExecutionRepositoryMock.workflowExecutions.get(`child-exec-${index + 1}`)
    ) as EsWorkflowExecution[];
  const parent = () =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get(PARENT_EXECUTION_ID);
  const joinStep = () =>
    Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).find(
      (step) => step.stepId === 'join' && step.stepType === 'workflow.awaitExecutions'
    );

  /** Advances the fake clock until `isDone` holds, so in-process poll sleeps can elapse. */
  const advanceUntil = async (isDone: () => boolean): Promise<void> => {
    for (let tick = 0; tick < 200 && !isDone(); tick++) {
      await jest.advanceTimersByTimeAsync(250);
    }
    expect(isDone()).toBe(true);
  };

  /** Runs the workflow until it completes or parks on a Task Manager wake. */
  const runWorkflow = async (workflowYaml: string, whilePolling?: () => void): Promise<void> => {
    let settled = false;
    const run = fixture.runWorkflow({ workflowYaml }).finally(() => {
      settled = true;
    });
    if (whilePolling) {
      await advanceUntil(() => settled || joinStep()?.status === ExecutionStatus.WAITING);
      whilePolling();
    }
    await advanceUntil(() => settled);
    await run;
  };

  /** Makes every child execution complete as soon as it starts. */
  const completeChildrenOnStart = (): void => {
    const executeWorkflow = jest.mocked(fixture.workflowsExecutionEngineMock.executeWorkflow);
    const startChild = executeWorkflow.getMockImplementation();
    if (!startChild) {
      throw new Error('executeWorkflow has no mock implementation');
    }
    executeWorkflow.mockImplementation(async (...args: Parameters<typeof startChild>) => {
      const started = await startChild(...args);
      const child = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        started.workflowExecutionId
      );
      if (child) {
        child.status = ExecutionStatus.COMPLETED;
      }
      return started;
    });
  };

  /** Moves the clock past the Task Manager wake that follows the in-process polls. */
  const resumeAfterTaskManagerWake = async (): Promise<void> => {
    jest.setSystemTime(new Date(Date.now() + 6_000));
    await fixture.resumeWorkflow();
  };

  beforeEach(() => {
    jest.useFakeTimers({ now, doNotFake: ['setImmediate', 'nextTick'] });
    fixture = new WorkflowRunFixture();
    fixture.taskManagerMock.ensureScheduled = jest.fn().mockResolvedValue({});

    jest.spyOn(WorkflowRepository.prototype, 'getWorkflow').mockResolvedValue({
      id: 'child-workflow',
      enabled: true,
      valid: true,
      definition: { steps: [] },
    } as unknown as EsWorkflow);

    let started = 0;
    jest
      .mocked(fixture.workflowsExecutionEngineMock.executeWorkflow)
      .mockImplementation(async () => {
        started += 1;
        const id = `child-exec-${started}`;
        fixture.workflowExecutionRepositoryMock.workflowExecutions.set(id, {
          id,
          workflowId: 'child-workflow',
          spaceId: 'fake_space_id',
          status: ExecutionStatus.RUNNING,
          startedAt: now.toISOString(),
          stepExecutionIds: [],
          context: { parentWorkflowExecutionId: PARENT_EXECUTION_ID },
        } as unknown as EsWorkflowExecution);
        return { workflowExecutionId: id };
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('joins children that finish during the first in-process polls without a Task Manager wake', async () => {
    await runWorkflow(FAN_OUT_YAML, () => {
      children().forEach((child) => {
        child.status = ExecutionStatus.COMPLETED;
      });
    });

    expect(parent()?.status).toBe(ExecutionStatus.COMPLETED);
    expect(joinStep()?.status).toBe(ExecutionStatus.COMPLETED);
    expect(fixture.taskManagerMock.schedule).not.toHaveBeenCalled();
    expect(Date.now() - now.getTime()).toBeLessThan(5_000);
  });

  it('parks on Task Manager when children outlast the in-process polls, then joins their outputs', async () => {
    await runWorkflow(FAN_OUT_YAML);

    expect(parent()?.status).toBe(ExecutionStatus.WAITING);
    expect(joinStep()?.status).toBe(ExecutionStatus.WAITING);
    expect(fixture.taskManagerMock.schedule).toHaveBeenCalled();

    children().forEach((child, index) => {
      child.status = ExecutionStatus.COMPLETED;
      child.context = { ...child.context, output: { enriched: index } };
    });
    await resumeAfterTaskManagerWake();

    expect(parent()?.status).toBe(ExecutionStatus.COMPLETED);
    expect(joinStep()?.status).toBe(ExecutionStatus.COMPLETED);
    expect(joinStep()?.output).toEqual({
      results: [
        expect.objectContaining({ executionId: 'child-exec-1', output: { enriched: 0 } }),
        expect.objectContaining({ executionId: 'child-exec-2', output: { enriched: 1 } }),
      ],
    });
  });

  it('fails fast when one child fails while the other is still running', async () => {
    await runWorkflow(FAN_OUT_YAML, () => {
      const [first] = children();
      first.status = ExecutionStatus.FAILED;
      first.error = { type: 'Error', message: 'lookup failed' };
    });

    expect(joinStep()?.status).toBe(ExecutionStatus.FAILED);
    expect(joinStep()?.error?.message).toBe(
      'Awaited execution child-exec-1 of workflow "child-workflow" ended with status failed: lookup failed'
    );
    expect(joinStep()?.output).toEqual({
      results: [
        expect.objectContaining({
          executionId: 'child-exec-1',
          status: ExecutionStatus.FAILED,
          error: expect.objectContaining({ message: 'lookup failed' }),
        }),
        expect.objectContaining({ executionId: 'child-exec-2', status: ExecutionStatus.RUNNING }),
      ],
    });
    expect(parent()?.status).toBe(ExecutionStatus.FAILED);
  });

  it('fails when an awaited execution was not started by this run', async () => {
    fixture.workflowExecutionRepositoryMock.workflowExecutions.set('foreign-exec', {
      id: 'foreign-exec',
      workflowId: 'other-workflow',
      spaceId: 'fake_space_id',
      status: ExecutionStatus.COMPLETED,
      startedAt: now.toISOString(),
      stepExecutionIds: [],
      context: { parentWorkflowExecutionId: 'some-other-run' },
    } as unknown as EsWorkflowExecution);

    await runWorkflow(`
steps:
  - name: join
    type: workflow.awaitExecutions
    with:
      execution-ids: [foreign-exec]
`);

    expect(joinStep()?.status).toBe(ExecutionStatus.FAILED);
    expect(joinStep()?.error?.message).toBe(
      'Workflow execution not found: foreign-exec. ' +
        'Only executions started by this workflow run can be awaited.'
    );
    expect(parent()?.status).toBe(ExecutionStatus.FAILED);
  });

  it('fails the step at its step-level timeout when children never finish', async () => {
    await runWorkflow(FAN_OUT_YAML);

    jest.setSystemTime(new Date(now.getTime() + 5 * 60_000 + 1_000));
    await fixture.resumeWorkflow();

    expect(joinStep()?.status).toBe(ExecutionStatus.FAILED);
    expect(parent()?.status).toBe(ExecutionStatus.FAILED);
    expect(parent()?.error?.type).toBe('TimeoutError');
  });

  it('awaits every branch of a parallel step referenced in from-steps', async () => {
    await runWorkflow(PARALLEL_FAN_OUT_YAML);

    expect(joinStep()?.status).toBe(ExecutionStatus.WAITING);
    expect(joinStep()?.input).toEqual({ 'from-steps': ['fan_out'], mode: 'settled' });
    expect(joinStep()?.state?.__durableStepState).toEqual(
      expect.objectContaining({
        customState: {
          executionIds: expect.arrayContaining(['child-exec-1', 'child-exec-2', 'child-exec-3']),
          mode: 'settled',
        },
      })
    );

    const [first, second, third] = children(3);
    first.status = ExecutionStatus.COMPLETED;
    second.status = ExecutionStatus.FAILED;
    third.status = ExecutionStatus.COMPLETED;
    await resumeAfterTaskManagerWake();

    expect(joinStep()?.status).toBe(ExecutionStatus.COMPLETED);
    expect(joinStep()?.output).toEqual({
      results: expect.arrayContaining([
        expect.objectContaining({ executionId: 'child-exec-1', status: 'completed' }),
        expect.objectContaining({ executionId: 'child-exec-2', status: 'failed' }),
        expect.objectContaining({ executionId: 'child-exec-3', status: 'completed' }),
      ]),
    });
  });

  it('awaits every iteration of a foreach step referenced in from-steps', async () => {
    await runWorkflow(`
steps:
  - name: per_host
    type: foreach
    foreach: '["host-a", "host-b", "host-c"]'
    steps:
      - name: scan_host
        type: workflow.executeAsync
        with:
          workflow-id: child-workflow
          inputs:
            host: "{{ foreach.item }}"
  - name: join
    type: workflow.awaitExecutions
    with:
      from-steps: [per_host]
`);

    expect(joinStep()?.state?.__durableStepState).toEqual(
      expect.objectContaining({
        customState: {
          executionIds: ['child-exec-1', 'child-exec-2', 'child-exec-3'],
          mode: 'fail-fast',
        },
      })
    );
  });

  it('awaits only the current iteration when the start step and the await share a foreach', async () => {
    completeChildrenOnStart();

    await runWorkflow(`
steps:
  - name: per_host
    type: foreach
    foreach: '["host-a", "host-b"]'
    steps:
      - name: scan_host
        type: workflow.executeAsync
        with:
          workflow-id: child-workflow
      - name: join
        type: workflow.awaitExecutions
        with:
          from-steps: [scan_host]
`);

    const joins = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values())
      .filter(
        ({ stepId, stepType }) => stepId === 'join' && stepType === 'workflow.awaitExecutions'
      )
      .sort((left, right) => left.globalExecutionIndex - right.globalExecutionIndex);
    expect(parent()?.status).toBe(ExecutionStatus.COMPLETED);
    expect(joins.map(({ output }) => output)).toEqual([
      { results: [expect.objectContaining({ executionId: 'child-exec-1' })] },
      { results: [expect.objectContaining({ executionId: 'child-exec-2' })] },
    ]);
  });

  describe('when the start step and the await share a parallel branch', () => {
    const joinSteps = () =>
      Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
        ({ stepId, stepType }) => stepId === 'join' && stepType === 'workflow.awaitExecutions'
      );

    const expectEachBranchJoinedOnlyItsChild = () => {
      const joinResults = joinSteps().map(
        ({ output }) => (output as { results: Array<{ executionId: string }> }).results
      );
      expect(parent()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(joinResults).toHaveLength(3);
      joinResults.forEach((results) => expect(results).toHaveLength(1));
      expect(joinResults.map(([{ executionId }]) => executionId).sort()).toEqual([
        'child-exec-1',
        'child-exec-2',
        'child-exec-3',
      ]);
    };

    it('awaits only its own branch', async () => {
      completeChildrenOnStart();

      await runWorkflow(PER_BRANCH_JOIN_YAML);

      expectEachBranchJoinedOnlyItsChild();
    });

    it('parks every branch on Task Manager, then joins only its own branch on resume', async () => {
      await runWorkflow(PER_BRANCH_JOIN_YAML);

      expect(parent()?.status).toBe(ExecutionStatus.WAITING);
      const parkedJoins = joinSteps();
      expect(parkedJoins.map(({ status }) => status)).toEqual([
        ExecutionStatus.WAITING,
        ExecutionStatus.WAITING,
        ExecutionStatus.WAITING,
      ]);
      parkedJoins.forEach(({ state }) =>
        expect(
          (state?.__durableStepState as { customState: { executionIds: string[] } }).customState
            .executionIds
        ).toHaveLength(1)
      );

      children(3).forEach((child) => {
        child.status = ExecutionStatus.COMPLETED;
      });
      await resumeAfterTaskManagerWake();

      expectEachBranchJoinedOnlyItsChild();
    });
  });

  it('fails when the referenced steps started no executions', async () => {
    await runWorkflow(`
steps:
  - name: maybe_enrich
    type: if
    condition: 'false'
    steps:
      - name: enrich
        type: workflow.executeAsync
        with:
          workflow-id: child-workflow
  - name: join
    type: workflow.awaitExecutions
    with:
      from-steps: [maybe_enrich]
`);

    expect(joinStep()?.status).toBe(ExecutionStatus.FAILED);
    expect(joinStep()?.error?.message).toBe(
      'Steps "maybe_enrich" started no workflow executions before this step. ' +
        'They must contain a workflow.executeAsync step that ran earlier on this path.'
    );
  });

  it('fails when from-steps references a step that contains the await', async () => {
    await runWorkflow(`
steps:
  - name: per_host
    type: foreach
    foreach: '["host-a", "host-b"]'
    steps:
      - name: scan_host
        type: workflow.executeAsync
        with:
          workflow-id: child-workflow
      - name: join
        type: workflow.awaitExecutions
        with:
          from-steps: [per_host]
`);

    expect(joinStep()?.status).toBe(ExecutionStatus.FAILED);
    expect(joinStep()?.error?.message).toBe(
      '"from-steps" references steps that contain this step: "per_host". ' +
        'They have not finished when this step runs.'
    );
    expect(parent()?.status).toBe(ExecutionStatus.FAILED);
  });
});
