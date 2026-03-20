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
import { jiraDataSource } from './data_type';

const CONNECTOR_NAME = 'fake-jira-connector';
const CONNECTOR_ID = 'fake-jira-connector-uuid';

describe('jira cloud workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(async () => {
    workflows = await loadWorkflowsThroughProductionPath(jiraDataSource, {
      stackConnectorId: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.jira-cloud' },
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
        case 'searchIssuesWithJql':
          return {
            status: 'ok',
            actionId,
            data: {
              issues: [{ id: '10001', key: 'PROJ-1', fields: { summary: 'Fix bug' } }],
              total: 1,
            },
          };
        case 'getIssue':
          return {
            status: 'ok',
            actionId,
            data: {
              id: '10001',
              key: `PROJ-${subActionParams.issueId}`,
              fields: { summary: 'Test Issue' },
            },
          };
        case 'getProject':
          return {
            status: 'ok',
            actionId,
            data: { id: subActionParams.projectId, key: 'PROJ', name: 'Test Project' },
          };
        case 'getProjects':
          return {
            status: 'ok',
            actionId,
            data: { values: [{ id: '1', key: 'PROJ', name: 'Test Project' }], total: 1 },
          };
        case 'searchUsers':
          return {
            status: 'ok',
            actionId,
            data: [
              { accountId: 'abc-123', displayName: 'Jane Doe', emailAddress: 'jane@example.com' },
            ],
          };
        default:
          throw new Error(`Unexpected Jira subAction: ${subAction}`);
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

  describe('search_issues_with_jql workflow', () => {
    it('forwards JQL query to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search_issues_with_jql'),
        inputs: { jql: 'project = PROJ AND status = Open', maxResults: 50 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-issues-with-jql')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchIssuesWithJql',
            subActionParams: {
              jql: 'project = PROJ AND status = Open',
              maxResults: 50,
              nextPageToken: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_resource workflow', () => {
    it('resourceType=issue routes to getIssue connector action', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_resource'),
        inputs: { resourceType: 'issue', id: 'PROJ-123' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-issue')).toHaveLength(1);
      expect(getStepExecutions('get-project')).toHaveLength(0);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getIssue',
            subActionParams: { issueId: 'PROJ-123' },
          }),
        })
      );
    });

    it('resourceType=project routes to getProject connector action', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_resource'),
        inputs: { resourceType: 'project', id: '10001' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-project')).toHaveLength(1);
      expect(getStepExecutions('get-issue')).toHaveLength(0);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getProject',
            subActionParams: { projectId: '10001' },
          }),
        })
      );
    });
  });

  describe('get_projects workflow', () => {
    it('forwards query parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_projects'),
        inputs: { query: 'backend', maxResults: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-projects')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getProjects',
            subActionParams: { query: 'backend', maxResults: 10, startAt: undefined },
          }),
        })
      );
    });
  });

  describe('search_users workflow', () => {
    it('forwards user search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search_users'),
        inputs: { query: 'jane', maxResults: 25 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-users')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchUsers',
            subActionParams: {
              query: 'jane',
              maxResults: 25,
              username: undefined,
              accountId: undefined,
              startAt: undefined,
              property: undefined,
            },
          }),
        })
      );
    });

    it('forwards accountId when searching by specific user', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search_users'),
        inputs: { accountId: 'abc-123-def' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchUsers',
            subActionParams: {
              accountId: 'abc-123-def',
              query: undefined,
              username: undefined,
              startAt: undefined,
              maxResults: undefined,
              property: undefined,
            },
          }),
        })
      );
    });
  });
});
