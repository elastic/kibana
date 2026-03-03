/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '../../../../../../../src/platform/plugins/shared/workflows_execution_engine/integration_tests/workflow_run_fixture';
import { loadDataSourceWorkflow } from '../helpers/data_source_workflow_helper';

const CONNECTOR_NAME = 'fake-slack-connector';
const CONNECTOR_ID = 'fake-slack-connector-uuid';

const loadWorkflow = (file: string): string =>
  loadDataSourceWorkflow('slack', file, {
    'slack2-stack-connector-id': CONNECTOR_NAME,
  });

describe('slack workflows', () => {
  let fixture: WorkflowRunFixture;

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
          return {
            status: 'ok',
            actionId,
            data: { ok: true, ts: '1234567890.123456', channel: 'C123' },
          };
        case 'searchMessages':
          return {
            status: 'ok',
            actionId,
            data: {
              matches: [
                {
                  text: 'Found message',
                  channel: { id: 'C123', name: 'general' },
                  permalink: 'https://slack.com/archives/C123/p123',
                },
              ],
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

  describe('send_message workflow', () => {
    it('forwards message parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('send_message.yaml'),
        inputs: { channel: 'C123ABC', text: 'Hello from test', thread_ts: '1234.5678' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('send-message')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'sendMessage',
            subActionParams: expect.objectContaining({
              channel: 'C123ABC',
              text: 'Hello from test',
              threadTs: '1234.5678',
            }),
          }),
        })
      );
    });
  });

  describe('search_messages workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('search_messages.yaml'),
        inputs: { query: 'deployment update', in_channel: 'engineering', count: 5 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-messages')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchMessages',
            subActionParams: expect.objectContaining({
              query: 'deployment update',
              inChannel: 'engineering',
              count: 5,
            }),
          }),
        })
      );
    });
  });
});
