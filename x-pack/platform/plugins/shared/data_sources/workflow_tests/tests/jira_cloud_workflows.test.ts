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

const CONNECTOR_NAME = 'fake-jira-connector';
const CONNECTOR_ID = 'fake-jira-connector-uuid';

const loadWorkflow = (file: string): string =>
  loadDataSourceWorkflow('jira-cloud', file, {
    'jira-cloud-stack-connector-id': CONNECTOR_NAME,
  });

describe('jira cloud workflows', () => {
  let fixture: WorkflowRunFixture;

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
              issues: [
                { id: '10001', key: 'PROJ-1', fields: { summary: 'Fix bug' } },
                { id: '10002', key: 'PROJ-2', fields: { summary: 'Add feature' } },
              ],
              total: 2,
            },
          };
        case 'searchUsers':
          return {
            status: 'ok',
            actionId,
            data: [
              { accountId: 'abc123', displayName: 'Test User', emailAddress: 'test@example.com' },
            ],
          };
        case 'getIssue':
          return {
            status: 'ok',
            actionId,
            data: {
              id: '10001',
              key: `PROJ-${subActionParams.issueId}`,
              fields: { summary: 'Test Issue', status: { name: 'Open' } },
            },
          };
        case 'getProject':
          return {
            status: 'ok',
            actionId,
            data: {
              id: subActionParams.projectId,
              key: 'PROJ',
              name: 'Test Project',
            },
          };
        case 'getProjects':
          return {
            status: 'ok',
            actionId,
            data: {
              values: [{ id: '1', key: 'PROJ', name: 'Test Project' }],
              total: 1,
            },
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

  describe('search_issues_with_jql workflow', () => {
    it('forwards JQL query to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('search_issues_with_jql.yaml'),
        inputs: { jql: 'project = PROJ AND status = Open', maxResults: 50 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-issues-with-jql')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchIssuesWithJql',
            subActionParams: expect.objectContaining({
              jql: 'project = PROJ AND status = Open',
              maxResults: 50,
            }),
          }),
        })
      );
    });
  });

  describe('get_resource workflow', () => {
    it('resourceType=issue routes to getIssue connector action', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('get_resource.yaml'),
        inputs: { resourceType: 'issue', id: 'PROJ-123' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-issue')).toHaveLength(1);
      expect(getStepExecutions('get-project')).toHaveLength(0);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getIssue',
            subActionParams: expect.objectContaining({ issueId: 'PROJ-123' }),
          }),
        })
      );
    });

    it('resourceType=project routes to getProject connector action', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('get_resource.yaml'),
        inputs: { resourceType: 'project', id: '10001' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-project')).toHaveLength(1);
      expect(getStepExecutions('get-issue')).toHaveLength(0);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getProject',
            subActionParams: expect.objectContaining({ projectId: '10001' }),
          }),
        })
      );
    });
  });

  describe('get_projects workflow', () => {
    it('forwards query parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('get_projects.yaml'),
        inputs: { query: 'backend', maxResults: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-projects')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getProjects',
            subActionParams: expect.objectContaining({
              query: 'backend',
              maxResults: 10,
            }),
          }),
        })
      );
    });
  });
});
