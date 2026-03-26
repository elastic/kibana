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
  registerExtensionSteps,
  type ProcessedWorkflow,
} from '../workflow.test_helpers';

const CONNECTOR_NAME = 'fake-zendesk-connector';
const CONNECTOR_ID = 'fake-zendesk-connector-uuid';

describe('zendesk workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(() => {
    workflows = loadWorkflowsFromConnectorSpec('.zendesk', {
      connectorName: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.zendesk' },
    ]);

    registerExtensionSteps(fixture);

    fixture.scopedActionsClientMock.returnMockedConnectorResult = async ({
      actionId,
      params,
    }: {
      actionId: string;
      params: Record<string, unknown>;
    }): Promise<ActionTypeExecutorResult<unknown>> => {
      const subAction = params.subAction as string;

      switch (subAction) {
        case 'whoAmI':
          return {
            status: 'ok',
            actionId,
            data: { id: 123, name: 'Test User', email: 'test@example.com' },
          };
        case 'search':
          return {
            status: 'ok',
            actionId,
            data: [
              {
                count: 1,
                next_page: null,
                previous_page: null,
                results: [
                  {
                    id: 456,
                    result_type: 'ticket',
                    subject: 'Test ticket',
                    description: 'A test',
                    status: 'open',
                    priority: 'normal',
                    created_at: '2024-01-01',
                    updated_at: '2024-01-02',
                    url: 'https://test.zendesk.com/api/v2/tickets/456',
                    requester_id: 1,
                    assignee_id: 2,
                    submitter_id: 1,
                    tags: ['test'],
                  },
                ],
              },
            ],
          };
        case 'listTickets':
          return {
            status: 'ok',
            actionId,
            data: [
              {
                count: 1,
                next_page: null,
                previous_page: null,
                tickets: [{ id: 789, subject: 'Ticket 1', status: 'open' }],
              },
            ],
          };
        case 'getTicket':
          return {
            status: 'ok',
            actionId,
            data: { id: 456, subject: 'Test ticket', status: 'open' },
          };
        case 'getTicketComments':
          return {
            status: 'ok',
            actionId,
            data: { comments: [{ id: 1, body: 'A comment', public: true }] },
          };
        default:
          throw new Error(`Unexpected Zendesk subAction: ${subAction}`);
      }
    };
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
    it('calls whoAmI with no parameters', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'who_am_i'),
        inputs: {},
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'whoAmI',
            subActionParams: {},
          }),
        })
      );
    });
  });

  describe('search workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { query: 'type:ticket status:open', per_page: 25 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'search',
            subActionParams: {
              query: 'type:ticket status:open',
              sortBy: undefined,
              sortOrder: undefined,
              page: undefined,
              perPage: 25,
              include: undefined,
            },
          }),
        })
      );
    });
  });

  describe('list_tickets workflow', () => {
    it('forwards list parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list_tickets'),
        inputs: { page: 2, per_page: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listTickets',
            subActionParams: {
              page: 2,
              perPage: 10,
              include: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_ticket workflow', () => {
    it('retrieves a ticket by ID', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_ticket'),
        inputs: { ticket_id: '456' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getTicket',
            subActionParams: {
              ticketId: '456',
            },
          }),
        })
      );
    });
  });

  describe('get_ticket_comments workflow', () => {
    it('retrieves comments for a ticket', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_ticket_comments'),
        inputs: { ticket_id: '456' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getTicketComments',
            subActionParams: {
              ticketId: '456',
              page: 1,
              perPage: 25,
            },
          }),
        })
      );
    });
  });
});
