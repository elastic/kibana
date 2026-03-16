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
  registerExtensionSteps,
  type ProcessedWorkflow,
} from '../workflow.test_helpers';
import { tavilyDataSource } from './data_type';

const CONNECTOR_NAME = 'fake-mcp-connector';
const CONNECTOR_ID = 'fake-mcp-connector-uuid';

describe('tavily workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(async () => {
    workflows = await loadWorkflowsThroughProductionPath(tavilyDataSource, {
      stackConnectorId: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.mcp' },
    ]);

    registerExtensionSteps(fixture);

    fixture.scopedActionsClientMock.returnMockedConnectorResult = async ({
      actionId,
    }: {
      actionId: string;
      params: Record<string, unknown>;
    }): Promise<ActionTypeExecutorResult<unknown>> => ({
      status: 'ok',
      actionId,
      data: {
        content: [
          {
            text: JSON.stringify([
              {
                query: 'test',
                answer: 'answer',
                response_time: 0.5,
                results: [
                  {
                    title: 'Result',
                    url: 'https://example.com',
                    content: 'content',
                    score: 0.9,
                    published_date: '2024-01-01',
                  },
                ],
              },
            ]),
          },
        ],
      },
    });
  });

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
    it('forwards search parameters to the MCP connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { query: 'kibana dashboards', max_results: 5, search_depth: 'advanced' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'tavily_search',
              arguments: {
                query: 'kibana dashboards',
                max_results: 5,
                search_depth: 'advanced',
                include_raw_content: false,
              },
            },
          }),
        })
      );
    });
  });

  describe('extract workflow', () => {
    it('forwards extract parameters to the MCP connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'extract'),
        inputs: { urls: ['https://example.com', 'https://example.org'] },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'tavily_extract',
              arguments: {
                urls: ['https://example.com', 'https://example.org'],
                extract_depth: 'basic',
                include_images: false,
              },
            },
          }),
        })
      );
    });
  });

  describe('map workflow', () => {
    it('forwards map parameters to the MCP connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'map'),
        inputs: { url: 'https://example.com', instructions: 'find docs' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'tavily_map',
              arguments: {
                url: 'https://example.com',
                max_depth: 1,
                max_breadth: 20,
                limit: 50,
                instructions: 'find docs',
              },
            },
          }),
        })
      );
    });
  });

  describe('crawl workflow', () => {
    it('forwards crawl parameters to the MCP connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'crawl'),
        inputs: { url: 'https://example.com', limit: 10, extract_depth: 'advanced' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'tavily_crawl',
              arguments: {
                url: 'https://example.com',
                max_depth: 1,
                max_breadth: 20,
                limit: 10,
                instructions: undefined,
                extract_depth: 'advanced',
              },
            },
          }),
        })
      );
    });
  });
});
