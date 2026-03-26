/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/integration_tests/workflow_run_fixture';
import {
  getWorkflowYaml,
  loadWorkflowsFromConnectorSpec,
  type ProcessedWorkflow,
} from '../workflow.test_helpers';

const CONNECTOR_NAME = 'fake-slack-connector';
const CONNECTOR_ID = 'fake-slack-connector-uuid';

describe('slack workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(() => {
    workflows = loadWorkflowsFromConnectorSpec('.slack2', {
      connectorName: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.slack2' },
    ]);

    fixture.scopedActionsClientMock.returnMockedConnectorResult = async ({
      actionId,
      params,
    }: {
      actionId: string;
      params: Record<string, unknown>;
    }): Promise<ActionTypeExecutorResult<unknown>> => {
      const subAction = params.subAction as string;

      switch (subAction) {
        case 'sendMessage':
          return { status: 'ok', actionId, data: { ok: true, ts: '1234567890.123456' } };
        case 'searchMessages':
          return {
            status: 'ok',
            actionId,
            data: {
              matches: [{ text: 'Found message', channel: { id: 'C123', name: 'general' } }],
            },
          };
        default:
          throw new Error(`Unexpected Slack subAction: ${subAction}`);
      }
    };
  });

  const getStepExecutions = (stepId: string) =>
    Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
      (se) => se.stepId === stepId
    );

  const getWorkflowExecution = () =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  it('all workflows pass production validation without liquid template errors', () => {
    for (const wf of workflows) {
      expect({ workflow: wf.name, liquidErrors: wf.liquidErrors }).toEqual({
        workflow: wf.name,
        liquidErrors: [],
      });
    }
  });

  describe('send_message workflow', () => {
    it('forwards message parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'send_message'),
        inputs: { channel: 'C123ABC', text: 'Hello from test', thread_ts: '1234.5678' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('send-message')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'sendMessage',
            subActionParams: {
              channel: 'C123ABC',
              text: 'Hello from test',
              threadTs: '1234.5678',
              unfurlLinks: undefined,
              unfurlMedia: undefined,
            },
          }),
        })
      );
    });
  });

  describe('search_messages workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search_messages'),
        inputs: { query: 'deployment update', in_channel: 'engineering', count: 5 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-messages')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchMessages',
            subActionParams: {
              query: 'deployment update',
              inChannel: 'engineering',
              count: 5,
              fromUser: undefined,
              after: undefined,
              before: undefined,
              sort: 'score',
              sortDir: 'desc',
              cursor: undefined,
              raw: false,
            },
          }),
        })
      );
    });
  });
});
