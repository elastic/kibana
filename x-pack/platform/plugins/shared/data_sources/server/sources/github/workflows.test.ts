/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '../../../../../../../../src/platform/plugins/shared/workflows_execution_engine/integration_tests/workflow_run_fixture';
import { renderWorkflowTemplate } from '../workflow_test_helpers';

const MCP_CONNECTOR_NAME = 'fake-mcp-connector';
const MCP_CONNECTOR_ID = 'fake-mcp-connector-uuid';
const GITHUB_CONNECTOR_NAME = 'fake-github-connector';
const GITHUB_CONNECTOR_ID = 'fake-github-connector-uuid';

const loadWorkflow = (file: string): string =>
  renderWorkflowTemplate(readFileSync(resolve(__dirname, 'workflows', file), 'utf-8'), {
    'mcp-stack-connector-id': MCP_CONNECTOR_NAME,
    'github-stack-connector-id': GITHUB_CONNECTOR_NAME,
  });

describe('github workflows', () => {
  let fixture: WorkflowRunFixture;

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: MCP_CONNECTOR_ID, name: MCP_CONNECTOR_NAME, actionTypeId: '.mcp' },
      { id: GITHUB_CONNECTOR_ID, name: GITHUB_CONNECTOR_NAME, actionTypeId: '.github' },
    ]);

    fixture.scopedActionsClientMock.returnMockedConnectorResult = async ({
      actionId,
      params,
    }: {
      actionId: string;
      params: Record<string, unknown>;
    }): Promise<ActionTypeExecutorResult<unknown>> => {
      const subAction = params.subAction as string;
      const subActionParams = params.subActionParams as Record<string, unknown>;

      switch (subAction) {
        case 'callTool':
          return {
            status: 'ok',
            actionId,
            data: {
              content: [{ type: 'text', text: JSON.stringify({ total_count: 1, items: [{ name: 'result.ts' }] }) }],
            },
          };
        case 'getDoc':
          return {
            status: 'ok',
            actionId,
            data: { name: subActionParams.path, content: Buffer.from('file content').toString('base64'), encoding: 'base64' },
          };
        default:
          throw new Error(`Unexpected GitHub subAction: ${subAction}`);
      }
    };
  });

  const getStepExecutions = (stepId: string) =>
    Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
      (se) => se.stepId === stepId
    );

  const getWorkflowExecution = () =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  describe('search workflow', () => {
    it('calls MCP callTool with the selected search tool and query', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('search.yaml'),
        inputs: { tool_name: 'search_code', query: 'handleError language:typescript', per_page: 5 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-github')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: expect.objectContaining({
              name: 'search_code',
              arguments: expect.objectContaining({ query: 'handleError language:typescript', perPage: 5 }),
            }),
          }),
        })
      );
    });
  });

  describe('get_doc workflow', () => {
    it('forwards repository and path parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('get_doc.yaml'),
        inputs: { owner: 'elastic', repo: 'kibana', path: 'README.md', ref: 'main' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-doc')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getDoc',
            subActionParams: expect.objectContaining({ owner: 'elastic', repo: 'kibana', path: 'README.md', ref: 'main' }),
          }),
        })
      );
    });
  });
});
