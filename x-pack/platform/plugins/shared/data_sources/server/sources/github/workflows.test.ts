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

  describe('search_code workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'sources.github.search_code'),
        inputs: { query: 'handleError language:typescript', page: 2, per_page: 5 },
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
  });

  describe('search_issues workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'sources.github.search_issues'),
        inputs: {
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

  describe('search_pull_requests workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'sources.github.search_pull_requests'),
        inputs: { query: 'fix memory leak', order: 'desc', sort: 'created', page: 1, per_page: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-pull-requests')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchPullRequests',
            subActionParams: {
              query: 'fix memory leak',
              order: 'desc',
              sort: 'created',
              page: 1,
              perPage: 10,
            },
          }),
        })
      );
    });
  });

  describe('search_repositories workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'sources.github.search_repositories'),
        inputs: { query: 'kibana stars:>1000', page: 1, per_page: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-repositories')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchRepositories',
            subActionParams: {
              query: 'kibana stars:>1000',
              page: 1,
              perPage: 10,
            },
          }),
        })
      );
    });
  });

  describe('search_users workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'sources.github.search_users'),
        inputs: { query: 'torvalds', page: 1, per_page: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-users')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchUsers',
            subActionParams: {
              query: 'torvalds',
              page: 1,
              perPage: 10,
            },
          }),
        })
      );
    });
  });

  describe('list_issues workflow', () => {
    it('forwards repository and pagination parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'sources.github.list_issues'),
        inputs: { owner: 'elastic', repo: 'kibana', state: 'open', first: 10 },
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
  });

  describe('list_pull_requests workflow', () => {
    it('forwards repository and pagination parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'sources.github.list_pull_requests'),
        inputs: { owner: 'elastic', repo: 'kibana', state: 'open', first: 10 },
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
});
