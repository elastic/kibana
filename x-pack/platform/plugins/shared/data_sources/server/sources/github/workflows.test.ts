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

const CONNECTOR_NAME = 'fake-github-connector';
const CONNECTOR_ID = 'fake-github-connector-uuid';

describe('github workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(async () => {
    workflows = await loadWorkflowsThroughProductionPath(githubDataSource, {
      stackConnectorId: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.github' },
    ]);

    fixture.scopedActionsClientMock.returnMockedConnectorResult = async ({
      actionId,
    }: {
      actionId: string;
      params: Record<string, unknown>;
    }): Promise<ActionTypeExecutorResult<unknown>> => {
      return {
        status: 'ok',
        actionId,
        data: {
          content: [{ type: 'text', text: JSON.stringify({ total_count: 1, items: [] }) }],
        },
      };
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
    it('routes to searchCode and forwards parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'source.search'),
        inputs: {
          search_type: 'searchCode',
          query: 'handleError language:typescript',
          page: 2,
          per_page: 5,
        },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-code')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchCode',
            subActionParams: {
              query: 'handleError language:typescript',
              page: 2,
              perPage: 5,
            },
          }),
        })
      );
    });

    it('routes to searchIssues and forwards parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'source.search'),
        inputs: {
          search_type: 'searchIssues',
          query: 'is:open label:bug',
          order: 'asc',
          sort: 'updated',
          page: 1,
          per_page: 10,
        },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-issues')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchIssues',
            subActionParams: {
              query: 'is:open label:bug',
              order: 'asc',
              sort: 'updated',
              page: 1,
              perPage: 10,
            },
          }),
        })
      );
    });
  });

  describe('list workflow', () => {
    it('routes to listIssues and forwards repository and pagination parameters', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'source.list'),
        inputs: {
          list_type: 'listIssues',
          owner: 'elastic',
          repo: 'kibana',
          state: 'open',
          first: 10,
        },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('list-issues')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listIssues',
            subActionParams: {
              owner: 'elastic',
              repo: 'kibana',
              state: 'open',
              first: 10,
              after: undefined,
            },
          }),
        })
      );
    });

    it('routes to listPullRequests and forwards repository and pagination parameters', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'source.list'),
        inputs: {
          list_type: 'listPullRequests',
          owner: 'elastic',
          repo: 'kibana',
          state: 'open',
          first: 10,
        },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('list-pull-requests')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'listPullRequests',
            subActionParams: {
              owner: 'elastic',
              repo: 'kibana',
              state: 'open',
              first: 10,
              after: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get workflow', () => {
    it('routes to getIssue and forwards parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'source.get'),
        inputs: {
          resource_type: 'getIssue',
          owner: 'elastic',
          repo: 'kibana',
          issue_number: 123,
        },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-issue')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getIssue',
            subActionParams: {
              owner: 'elastic',
              repo: 'kibana',
              issueNumber: 123,
            },
          }),
        })
      );
    });

    it('routes to pullRequestRead and forwards method selector to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'source.get'),
        inputs: {
          resource_type: 'pullRequestRead',
          owner: 'elastic',
          repo: 'kibana',
          pull_number: 42,
          pull_request_method: 'get_diff',
        },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('pull-request-read')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'pullRequestRead',
            subActionParams: {
              owner: 'elastic',
              repo: 'kibana',
              pullNumber: 42,
              method: 'get_diff',
            },
          }),
        })
      );
    });
  });

  describe('who_am_i workflow', () => {
    it('calls getMe and forwards parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'source.who_am_i'),
        inputs: {},
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-me')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getMe',
            subActionParams: {},
          }),
        })
      );
    });
  });
});
