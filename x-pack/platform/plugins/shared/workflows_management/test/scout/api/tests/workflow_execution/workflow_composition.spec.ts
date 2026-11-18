/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { isTerminalStatus } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';
import { spaceTest } from '../../fixtures';

// ---------------------------------------------------------------------------
// Workflow YAML templates — "System Health Monitoring" scenario
// ---------------------------------------------------------------------------

const CHILD_HEALTH_CHECK_YAML = `
name: Check Service Health
enabled: true
description: Validates health of a given service and returns diagnostic output
triggers:
  - type: manual
    inputs:
      - name: service_name
        type: string
        default: "api-gateway"

steps:
  - name: health_check
    type: console
    with:
      message: "Health check passed for {{ inputs.service_name }}"
`;

const getAsyncParentYaml = (childWorkflowId: string) => `
name: Monitor Services Async
enabled: true
description: Dispatches health checks asynchronously without waiting for results
triggers:
  - type: manual
    inputs:
      - name: service_name
        type: string
        default: "api-gateway"

steps:
  - name: log_start
    type: console
    with:
      message: "Initiating async health check for {{ inputs.service_name }}"

  - name: dispatch_health_check
    type: workflow.executeAsync
    with:
      workflow-id: ${childWorkflowId}
      inputs:
        service_name: "{{ inputs.service_name }}"

  - name: log_dispatch
    type: console
    with:
      message: "{{steps.dispatch_health_check.output | json}}"
`;

const getSyncParentYaml = (childWorkflowId: string) => `
name: Monitor Services Sync
enabled: true
description: Runs health check synchronously and waits for the result
triggers:
  - type: manual
    inputs:
      - name: service_name
        type: string
        default: "api-gateway"

steps:
  - name: log_start
    type: console
    with:
      message: "Initiating sync health check for {{ inputs.service_name }}"

  - name: run_health_check
    type: workflow.execute
    with:
      workflow-id: ${childWorkflowId}
      inputs:
        service_name: "{{ inputs.service_name }}"

  - name: log_result
    type: console
    with:
      message: "{{steps.run_health_check.output | json}}"
`;

const getAsyncJoinParentYaml = (childWorkflowId: string, mode: 'fail-fast' | 'settled') => `
name: Monitor Services Async Join (${mode})
enabled: true
description: Dispatches health checks asynchronously and joins their results
triggers:
  - type: manual

steps:
  - name: dispatch_health_checks
    type: foreach
    foreach: '["api-gateway", "payments-service", "auth-service"]'
    steps:
      - name: dispatch_health_check
        type: workflow.executeAsync
        with:
          workflow-id: ${childWorkflowId}
          inputs:
            service_name: "{{ foreach.item }}"

  - name: join_health_checks
    type: workflow.awaitExecutions
    timeout: 1m
    with:
      from-steps: [dispatch_health_checks]
      mode: ${mode}
`;

const FAILING_CHILD_YAML = `
name: Notify via Slack
enabled: true
description: Sends Slack notification (fails due to non-existing connector)
triggers:
  - type: manual

steps:
  - name: send_notification
    type: slack
    connector-id: "non-existing-slack-connector"
    with:
      message: "Health check alert triggered"
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SYNC_POLL_TIMEOUT = 30_000;

async function waitForExecution(workflowsApi: WorkflowsApiService, executionId: string) {
  return waitForConditionOrThrow({
    action: () => workflowsApi.getExecution(executionId),
    condition: (exec) => !!exec && isTerminalStatus(exec.status ?? ''),
    interval: 1000,
    timeout: SYNC_POLL_TIMEOUT,
    errorMessage: (exec) =>
      `Execution ${executionId} did not terminate within ${SYNC_POLL_TIMEOUT}ms (last status: ${exec?.status})`,
  });
}

interface AwaitedExecutionResult {
  executionId: string;
  status: string;
  error?: { message: string };
}

async function getJoinStep(workflowsApi: WorkflowsApiService, executionId: string) {
  const execution = await workflowsApi.getExecution(executionId, { includeOutput: true });
  const stepExecutions = execution?.stepExecutions ?? [];
  const joinStep = stepExecutions.find(
    (s) => s.stepId === 'join_health_checks' && s.stepType === 'workflow.awaitExecutions'
  );
  const dispatchedExecutionIds = stepExecutions
    .filter((s) => s.stepId === 'dispatch_health_check' && s.stepType === 'workflow.executeAsync')
    .map((s) => (s.output as { executionId: string }).executionId);
  const output = joinStep?.output as { results: AwaitedExecutionResult[] } | undefined;
  return { joinStep, dispatchedExecutionIds, results: output?.results ?? [] };
}

async function expectResultsForDispatched(
  workflowsApi: WorkflowsApiService,
  results: AwaitedExecutionResult[],
  dispatchedExecutionIds: string[],
  expectedWorkflowId: string
) {
  expect(dispatchedExecutionIds).toHaveLength(3);
  expect(dispatchedExecutionIds.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
  expect(new Set(dispatchedExecutionIds).size).toBe(3);
  expect(results.map(({ executionId }) => executionId).sort()).toStrictEqual(
    [...dispatchedExecutionIds].sort()
  );

  const childExecutions = await Promise.all(
    dispatchedExecutionIds.map((id) => workflowsApi.getExecution(id))
  );
  childExecutions.forEach((child) => expect(child?.workflowId).toBe(expectedWorkflowId));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

spaceTest.describe('Workflow composition', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;
  let childWorkflowId: string;
  let asyncParentId: string;
  let syncParentId: string;

  spaceTest.beforeAll(async ({ apiServices }) => {
    spaceTest.setTimeout(60_000);
    workflowsApi = apiServices.workflowsApi;

    const child = await workflowsApi.create(CHILD_HEALTH_CHECK_YAML);
    childWorkflowId = child.id;

    const asyncParent = await workflowsApi.create(getAsyncParentYaml(childWorkflowId));
    asyncParentId = asyncParent.id;

    const syncParent = await workflowsApi.create(getSyncParentYaml(childWorkflowId));
    syncParentId = syncParent.id;
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  // -- Async strategy -------------------------------------------------------

  spaceTest('async: dispatches child workflow and receives execution metadata', async () => {
    const { workflowExecutionId } = await workflowsApi.run(asyncParentId, {
      service_name: 'payments-service',
    });

    const parentExecution = await workflowsApi.waitForTermination({ workflowExecutionId });
    expect(parentExecution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(parentExecution?.stepExecutions).toHaveLength(3);

    const executionWithOutputs = await workflowsApi.getExecution(workflowExecutionId, {
      includeOutput: true,
    });
    const dispatchStep = executionWithOutputs?.stepExecutions.find(
      (s) => s.stepId === 'dispatch_health_check'
    );
    const output = dispatchStep?.output as Record<string, unknown>;

    expect(output?.workflowId).toBe(childWorkflowId);
    expect(typeof output?.executionId).toBe('string');
    expect(output?.awaited).toBe(false);
    expect(output?.status).toBe('pending');

    const childExecution = await workflowsApi.getExecution(output?.executionId as string);
    expect(childExecution).toBeDefined();
  });

  // -- Async strategy joined with workflow.awaitExecutions -------------------

  spaceTest(
    'async join: awaits every child started in a foreach and returns their results',
    async () => {
      const parent = await workflowsApi.create(
        getAsyncJoinParentYaml(childWorkflowId, 'fail-fast')
      );
      const { workflowExecutionId } = await workflowsApi.run(parent.id, {});

      const parentExecution = await waitForExecution(workflowsApi, workflowExecutionId);
      expect(parentExecution?.status).toBe(ExecutionStatus.COMPLETED);

      const { joinStep, dispatchedExecutionIds, results } = await getJoinStep(
        workflowsApi,
        workflowExecutionId
      );
      expect(joinStep?.status).toBe(ExecutionStatus.COMPLETED);
      await expectResultsForDispatched(
        workflowsApi,
        results,
        dispatchedExecutionIds,
        childWorkflowId
      );
      expect(results.every(({ status }) => status === ExecutionStatus.COMPLETED)).toBe(true);
    }
  );

  spaceTest('async join: fails fast when a child fails', async () => {
    const failingChild = await workflowsApi.create(FAILING_CHILD_YAML);
    const parent = await workflowsApi.create(getAsyncJoinParentYaml(failingChild.id, 'fail-fast'));
    const { workflowExecutionId } = await workflowsApi.run(parent.id, {});

    const parentExecution = await waitForExecution(workflowsApi, workflowExecutionId);
    expect(parentExecution?.status).toBe(ExecutionStatus.FAILED);

    const { joinStep, dispatchedExecutionIds, results } = await getJoinStep(
      workflowsApi,
      workflowExecutionId
    );
    expect(joinStep?.status).toBe(ExecutionStatus.FAILED);
    expect(joinStep?.error?.message).toContain('Awaited execution');
    expect(joinStep?.error?.message).toContain('ended with status failed');
    await expectResultsForDispatched(
      workflowsApi,
      results,
      dispatchedExecutionIds,
      failingChild.id
    );
  });

  spaceTest(
    'async join (settled): completes and reports the failed children in results',
    async () => {
      const failingChild = await workflowsApi.create(FAILING_CHILD_YAML);
      const parent = await workflowsApi.create(getAsyncJoinParentYaml(failingChild.id, 'settled'));
      const { workflowExecutionId } = await workflowsApi.run(parent.id, {});

      const parentExecution = await waitForExecution(workflowsApi, workflowExecutionId);
      expect(parentExecution?.status).toBe(ExecutionStatus.COMPLETED);

      const { joinStep, dispatchedExecutionIds, results } = await getJoinStep(
        workflowsApi,
        workflowExecutionId
      );
      expect(joinStep?.status).toBe(ExecutionStatus.COMPLETED);
      await expectResultsForDispatched(
        workflowsApi,
        results,
        dispatchedExecutionIds,
        failingChild.id
      );
      results.forEach((result) => {
        expect(result.status).toBe(ExecutionStatus.FAILED);
        expect(typeof result.error?.message).toBe('string');
      });
    }
  );

  // -- Sync strategy ---------------------------------------------------------

  spaceTest('sync: waits for child workflow and completes with correct step count', async () => {
    const { workflowExecutionId } = await workflowsApi.run(syncParentId, {
      service_name: 'auth-service',
    });

    const parentExecution = await waitForExecution(workflowsApi, workflowExecutionId);

    expect(parentExecution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(parentExecution?.stepExecutions).toHaveLength(3);

    const { results: childExecutions } = await workflowsApi.getExecutions(childWorkflowId);
    const completedChildren = childExecutions.filter((e) => e.status === ExecutionStatus.COMPLETED);
    expect(completedChildren.length).toBeGreaterThan(0);
  });

  spaceTest('sync: fails when child workflow fails', async () => {
    const failingChild = await workflowsApi.create(FAILING_CHILD_YAML);
    const failingParent = await workflowsApi.create(getSyncParentYaml(failingChild.id));

    const { workflowExecutionId } = await workflowsApi.run(failingParent.id, {
      service_name: 'broken-service',
    });

    const parentExecution = await waitForExecution(workflowsApi, workflowExecutionId);

    expect(parentExecution?.status).toBe(ExecutionStatus.FAILED);
  });
});
