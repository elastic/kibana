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

const FAILING_WORKFLOW_YAML = `
name: Scout Error Trigger - Failing Workflow
enabled: true
description: Fails on purpose to trigger workflows.failed
triggers:
  - type: manual
steps:
  - name: fail_step
    type: slack
    connector-id: "non-existing-slack-connector-error-trigger"
    with:
      message: "intentional failure for workflows.failed test"
`;

const ERROR_HANDLER_WORKFLOW_YAML = `
name: Scout Error Trigger - Error Handler
enabled: true
description: Subscribes to workflows.failed
triggers:
  - type: workflows.failed
    on:
      condition: 'not event.workflow.isErrorHandler:true'
steps:
  - name: log_event
    type: console
    with:
      message: "Error handler ran for workflow {{ event.workflow.name }}"
`;

/** Failing workflow whose name does not match "Scout*" (for filter-by-name no-match test). */
const FAILING_OTHER_NAME_WORKFLOW_YAML = `
name: Other Failing Workflow
enabled: true
description: Fails on purpose; name does not match Scout*
triggers:
  - type: manual
steps:
  - name: fail_step
    type: slack
    connector-id: "non-existing-slack-connector-error-trigger-other"
    with:
      message: "intentional failure for workflows.failed test"
`;

/** Error handler that runs only when event.workflow.name matches Scout* (wildcard). */
const ERROR_HANDLER_NAME_FILTER_YAML = `
name: Scout Error Trigger - Name Filter Handler
enabled: true
description: Subscribes to workflows.failed when workflow name matches Scout*
triggers:
  - type: workflows.failed
    on:
      condition: 'not event.workflow.isErrorHandler:true and event.workflow.name: Scout*'
steps:
  - name: log_event
    type: console
    with:
      message: "Name filter handler ran for {{ event.workflow.name }}"
`;

/** Error handler that runs only when event.error.stepId is "fail_step". */
const ERROR_HANDLER_STEP_ID_FILTER_YAML = `
name: Scout Error Trigger - StepId Filter Handler
enabled: true
description: Subscribes to workflows.failed when failed step id is fail_step
triggers:
  - type: workflows.failed
    on:
      condition: 'not event.workflow.isErrorHandler:true and event.error.stepId:"fail_step"'
steps:
  - name: log_event
    type: console
    with:
      message: "StepId filter handler ran for step {{ event.error.stepId }}"
`;

/** Child workflow that fails when dispatched async by a parent. */
const ASYNC_FAILING_CHILD_YAML = `
name: Scout Error Trigger - Async Failing Child
enabled: true
description: Child workflow dispatched async; fails on a non-existent connector
triggers:
  - type: manual
steps:
  - name: fail_step
    type: slack
    connector-id: "non-existing-slack-connector-async-child"
    with:
      message: "intentional async-child failure"
`;

/** Parent workflow that dispatches the failing child via workflow.executeAsync. */
const getAsyncParentYaml = (childWorkflowId: string) => `
name: Scout Error Trigger - Async Failing Parent
enabled: true
description: Dispatches a failing child async; parent should COMPLETE while child FAILS
triggers:
  - type: manual
steps:
  - name: dispatch_failing_child
    type: workflow.executeAsync
    with:
      workflow-id: ${childWorkflowId}
`;

/** The dispatched `workflows.failed` event is stored on the handler execution at `context.event`. */
function getTriggeringExecutionId(context: Record<string, unknown> | undefined) {
  const event = context?.event as { execution?: { id?: string } } | undefined;
  return event?.execution?.id;
}

/** IDs of the `handlerWorkflowId` executions dispatched by the failure of `failedExecutionId`. */
async function getHandlerExecutionsFor(
  workflowsApi: WorkflowsApiService,
  handlerWorkflowId: string,
  failedExecutionId: string
): Promise<string[]> {
  const { results } = await workflowsApi.getExecutions(handlerWorkflowId);
  const executions = await Promise.all(results.map(({ id }) => workflowsApi.getExecution(id)));
  return executions.flatMap((execution) =>
    execution && getTriggeringExecutionId(execution.context) === failedExecutionId
      ? [execution.id]
      : []
  );
}

async function waitForExecution(
  workflowsApi: WorkflowsApiService,
  executionId: string,
  timeoutMs = 30_000
) {
  return waitForConditionOrThrow({
    action: () => workflowsApi.getExecution(executionId),
    condition: (exec) => !!exec && isTerminalStatus(exec.status ?? ''),
    interval: 1000,
    timeout: timeoutMs,
    errorMessage: (exec) =>
      `Execution ${executionId} did not terminate within ${timeoutMs}ms (last status: ${exec?.status})`,
  });
}

// Suite consistently fails on MKI: https://github.com/elastic/kibana/issues/261499
spaceTest.describe(
  'Workflow error trigger (workflows.failed)',
  {
    tag: [
      ...tags.stateful.classic,
      '@local-serverless-observability_complete',
      '@local-serverless-security_complete',
      '@local-serverless-search',
    ],
  },
  () => {
    let workflowsApi: WorkflowsApiService;
    let failingWorkflowId: string;
    let errorHandlerWorkflowId: string;
    let failingOtherWorkflowId: string;
    let handlerNameFilterId: string;
    let handlerStepFilterId: string;
    let asyncFailingChildId: string;
    let asyncParentId: string;

    spaceTest.beforeAll(async ({ apiServices }) => {
      spaceTest.setTimeout(90_000);
      workflowsApi = apiServices.workflowsApi;

      const failing = await workflowsApi.create(FAILING_WORKFLOW_YAML);
      failingWorkflowId = failing.id;

      const failingOther = await workflowsApi.create(FAILING_OTHER_NAME_WORKFLOW_YAML);
      failingOtherWorkflowId = failingOther.id;

      const handler = await workflowsApi.create(ERROR_HANDLER_WORKFLOW_YAML);
      errorHandlerWorkflowId = handler.id;

      const handlerNameFilter = await workflowsApi.create(ERROR_HANDLER_NAME_FILTER_YAML);
      handlerNameFilterId = handlerNameFilter.id;

      const handlerStepFilter = await workflowsApi.create(ERROR_HANDLER_STEP_ID_FILTER_YAML);
      handlerStepFilterId = handlerStepFilter.id;

      const asyncFailingChild = await workflowsApi.create(ASYNC_FAILING_CHILD_YAML);
      asyncFailingChildId = asyncFailingChild.id;

      const asyncParent = await workflowsApi.create(getAsyncParentYaml(asyncFailingChildId));
      asyncParentId = asyncParent.id;
    });

    spaceTest.afterAll(async () => {
      await workflowsApi.deleteAll();
    });

    spaceTest(
      'when a workflow fails, a workflow subscribed to workflows.failed runs and receives the event',
      async () => {
        const { workflowExecutionId: failedExecutionId } = await workflowsApi.run(
          failingWorkflowId,
          {}
        );

        const failedExecution = await waitForExecution(workflowsApi, failedExecutionId);
        expect(failedExecution?.status).toBe(ExecutionStatus.FAILED);

        const { results: handlerExecutions } = await waitForConditionOrThrow({
          action: () => workflowsApi.getExecutions(errorHandlerWorkflowId),
          condition: ({ results: r }) => r.length >= 1,
          interval: 2000,
          timeout: 25_000,
          errorMessage: ({ results: r }) =>
            `Error-handler workflow should have at least one execution, got ${r.length}`,
        });

        expect(handlerExecutions.length).toBeGreaterThan(0);

        const firstHandlerExecution = handlerExecutions[0];
        expect(firstHandlerExecution).toBeDefined();
        const handlerExecutionId = (firstHandlerExecution as (typeof handlerExecutions)[number]).id;
        const handlerExecution = await waitForExecution(workflowsApi, handlerExecutionId);

        expect(handlerExecution?.triggeredBy).toBe('workflows.failed');
        expect(handlerExecution?.status).toBe(ExecutionStatus.COMPLETED);
      }
    );

    spaceTest('filter by workflow name: handler runs when name matches condition', async () => {
      const { workflowExecutionId: failedExecutionId } = await workflowsApi.run(
        failingWorkflowId,
        {}
      );

      const matchedHandlerExecutions = await waitForConditionOrThrow({
        action: () => getHandlerExecutionsFor(workflowsApi, handlerNameFilterId, failedExecutionId),
        condition: (matches) => matches.length > 0,
        interval: 2000,
        timeout: 25_000,
        errorMessage: () =>
          `Name filter handler should have run for failed execution ${failedExecutionId}`,
      });
      expect(matchedHandlerExecutions.length).toBeGreaterThan(0);
    });

    spaceTest(
      'filter by workflow name: handler does not run when name does not match',
      async () => {
        const { workflowExecutionId: otherExecutionId } = await workflowsApi.run(
          failingOtherWorkflowId,
          {}
        );
        await waitForExecution(workflowsApi, otherExecutionId);
        const quietAfterMs = Date.now() + 5000;

        const matchedHandlerExecutions = await waitForConditionOrThrow({
          action: () =>
            getHandlerExecutionsFor(workflowsApi, handlerNameFilterId, otherExecutionId),
          condition: (matches) => {
            if (matches.length > 0) {
              throw new Error(
                `Name filter handler should not run for non-Scout workflow, got ${
                  matches.length
                } execution(s) for ${otherExecutionId}: ${matches.join(', ')}`
              );
            }
            return Date.now() >= quietAfterMs;
          },
          interval: 1000,
          timeout: 25_000,
          errorMessage: () =>
            `Name filter handler stayed clear of execution ${otherExecutionId} but the quiet window never elapsed`,
        });
        expect(matchedHandlerExecutions).toHaveLength(0);
      }
    );

    spaceTest(
      'filter by failed step: handler runs when event.error.stepId matches condition',
      async () => {
        const { workflowExecutionId: failedExecutionId } = await workflowsApi.run(
          failingWorkflowId,
          {}
        );
        const failedExecution = await waitForExecution(workflowsApi, failedExecutionId);
        expect(failedExecution?.status).toBe(ExecutionStatus.FAILED);

        const { results: handlerExecutions } = await waitForConditionOrThrow({
          action: () => workflowsApi.getExecutions(handlerStepFilterId),
          condition: ({ results: r }) => r.length >= 1,
          interval: 2000,
          timeout: 25_000,
          errorMessage: ({ results: r }) =>
            `StepId filter handler should run when workflow fails at fail_step, got ${r.length} executions`,
        });

        const firstHandlerExecution = handlerExecutions[0];
        expect(firstHandlerExecution).toBeDefined();
        const handlerExecutionId = (firstHandlerExecution as (typeof handlerExecutions)[number]).id;
        const handlerExecution = await waitForExecution(workflowsApi, handlerExecutionId);
        expect(handlerExecution?.triggeredBy).toBe('workflows.failed');
        expect(handlerExecution?.status).toBe(ExecutionStatus.COMPLETED);
      }
    );

    spaceTest(
      'async: parent completes immediately while async child fails and emits workflows.failed',
      async () => {
        const { results: initialHandlerResults } = await workflowsApi.getExecutions(
          errorHandlerWorkflowId
        );
        const initialHandlerCount = initialHandlerResults.length;

        const { workflowExecutionId: parentExecutionId } = await workflowsApi.run(
          asyncParentId,
          {}
        );
        const parentExecution = await waitForExecution(workflowsApi, parentExecutionId);
        expect(parentExecution?.status).toBe(ExecutionStatus.COMPLETED);

        const { results: childExecutions } = await waitForConditionOrThrow({
          action: () => workflowsApi.getExecutions(asyncFailingChildId),
          condition: ({ results: r }) =>
            r.length >= 1 && r.some((e) => isTerminalStatus(e.status ?? '')),
          interval: 2000,
          timeout: 25_000,
          errorMessage: ({ results: r }) =>
            `Async failing child should reach a terminal status, got ${
              r.length
            } executions (statuses: ${r.map((e) => e.status).join(',')})`,
        });
        const failedChild = childExecutions.find((e) => isTerminalStatus(e.status ?? ''));
        expect(failedChild?.status).toBe(ExecutionStatus.FAILED);

        const { results: handlerExecutions } = await waitForConditionOrThrow({
          action: () => workflowsApi.getExecutions(errorHandlerWorkflowId),
          condition: ({ results: r }) => r.length >= initialHandlerCount + 1,
          interval: 2000,
          timeout: 25_000,
          errorMessage: ({ results: r }) =>
            `Error handler should run for async child failure, got ${r.length} (was ${initialHandlerCount})`,
        });
        const newestHandlerExecution = handlerExecutions[0];
        const verifiedHandlerExecution = await waitForExecution(
          workflowsApi,
          newestHandlerExecution.id
        );
        expect(verifiedHandlerExecution?.triggeredBy).toBe('workflows.failed');
        expect(verifiedHandlerExecution?.status).toBe(ExecutionStatus.COMPLETED);
      }
    );
  }
);
