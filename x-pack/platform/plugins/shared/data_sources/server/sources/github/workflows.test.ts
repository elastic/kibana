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
  loadWorkflowsThroughProductionPath,
  type ProcessedWorkflow,
} from '../workflow.test_helpers';
import { githubDataSource } from './data_type';

const MCP_CONNECTOR_NAME = 'fake-mcp-connector';
const MCP_CONNECTOR_ID = 'fake-mcp-connector-uuid';
const GITHUB_CONNECTOR_NAME = 'fake-github-connector';
const GITHUB_CONNECTOR_ID = 'fake-github-connector-uuid';

describe('github workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(async () => {
    workflows = await loadWorkflowsThroughProductionPath(githubDataSource, {
      stackConnectorId: GITHUB_CONNECTOR_NAME,
    });
  });

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
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ total_count: 1, items: [{ name: 'result.ts' }] }),
                },
              ],
            },
          };
        case 'getDoc':
          return {
            status: 'ok',
            actionId,
            data: {
              name: subActionParams.path,
              content: Buffer.from('file content').toString('base64'),
              encoding: 'base64',
            },
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

  it('all workflows pass production validation without liquid template errors', () => {
    for (const wf of workflows) {
      expect({ workflow: wf.name, liquidErrors: wf.liquidErrors }).toEqual({
        workflow: wf.name,
        liquidErrors: [],
      });
    }
  });

  describe('search workflow', () => {
    it('calls MCP callTool with the selected search tool and query', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'source.search'),
        inputs: { tool_name: 'search_code', query: 'handleError language:typescript', per_page: 5 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-github')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'search_code',
              arguments: {
                query: 'handleError language:typescript',
                order: 'desc',
                page: 1,
                perPage: 5,
                sort: 'created',
              },
            },
          }),
        })
      );
    });
  });

  describe('get_doc workflow', () => {
    it('forwards repository and path parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_doc'),
        inputs: { owner: 'elastic', repo: 'kibana', path: 'README.md', ref: 'main' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-doc')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getDoc',
            subActionParams: {
              owner: 'elastic',
              repo: 'kibana',
              path: 'README.md',
              ref: 'main',
            },
          }),
        })
      );
    });
  });
});
