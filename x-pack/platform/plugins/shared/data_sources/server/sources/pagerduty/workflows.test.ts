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
import { pagerdutyDataSource } from './data_type';

const CONNECTOR_NAME = 'fake-mcp-connector';
const CONNECTOR_ID = 'fake-mcp-connector-uuid';

const mcpResponse = (data: unknown) => JSON.stringify(Array.isArray(data) ? data : [data]);

describe('pagerduty workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(async () => {
    workflows = await loadWorkflowsThroughProductionPath(pagerdutyDataSource, {
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
        content: [{ text: mcpResponse({ response: [] }) }],
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

  describe('who_am_i workflow', () => {
    it('calls get_user_data with no arguments', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'who_am_i'),
        inputs: {},
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'get_user_data',
              arguments: {},
            },
          }),
        })
      );
    });
  });

  describe('search workflow', () => {
    it('searches users via list_users MCP tool', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { item_type: 'users', limit: 5, query: 'john' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'list_users',
              arguments: {
                query_model: {
                  limit: 5,
                  query: 'john',
                },
              },
            },
          }),
        })
      );
    });

    it('searches schedules via list_schedules MCP tool', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { item_type: 'schedules', limit: 10, query: 'primary' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'list_schedules',
              arguments: {
                query_model: {
                  limit: 10,
                  query: 'primary',
                  include: [],
                },
              },
            },
          }),
        })
      );
    });
  });

  describe('get_incidents workflow', () => {
    it('calls list_incidents MCP tool with filter params', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_incidents'),
        inputs: { limit: 10, status: ['triggered', 'acknowledged'] },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'list_incidents',
              arguments: {
                query_model: {
                  limit: 10,
                  status: ['triggered', 'acknowledged'],
                  service_ids: [],
                  user_ids: [],
                  since: undefined,
                  until: undefined,
                  urgencies: [],
                  request_scope: undefined,
                  sort_by: [],
                },
              },
            },
          }),
        })
      );
    });
  });

  describe('get_by_id workflow', () => {
    it('retrieves an incident by ID', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_by_id'),
        inputs: { item_type: 'incident', id: 'P123ABC' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'get_incident',
              arguments: {
                incident_id: 'P123ABC',
              },
            },
          }),
        })
      );
    });

    it('retrieves a schedule by ID', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_by_id'),
        inputs: { item_type: 'schedule', id: 'PSCHED1' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'get_schedule',
              arguments: {
                schedule_id: 'PSCHED1',
              },
            },
          }),
        })
      );
    });
  });

  describe('get_oncalls workflow', () => {
    it('calls list_oncalls MCP tool', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_oncalls'),
        inputs: { limit: 5 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'list_oncalls',
              arguments: {
                query_model: {
                  limit: 5,
                  schedule_ids: [],
                  user_ids: [],
                  escalation_policy_ids: [],
                  since: undefined,
                  until: undefined,
                  time_zone: undefined,
                  earliest: undefined,
                },
              },
            },
          }),
        })
      );
    });
  });

  describe('get_escalation_policies workflow', () => {
    it('calls list_escalation_policies MCP tool', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_escalation_policies'),
        inputs: { query: 'production', limit: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'callTool',
            subActionParams: {
              name: 'list_escalation_policies',
              arguments: {
                query_model: {
                  query: 'production',
                  limit: 10,
                  user_ids: [],
                  team_ids: [],
                },
              },
            },
          }),
        })
      );
    });
  });
});
