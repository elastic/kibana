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
import { notionDataSource } from './data_type';

const CONNECTOR_NAME = 'fake-notion-connector';
const CONNECTOR_ID = 'fake-notion-connector-uuid';

describe('notion workflows', () => {
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(async () => {
    workflows = await loadWorkflowsThroughProductionPath(notionDataSource, {
      stackConnectorId: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.notion' },
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
        case 'searchPageOrDSByTitle':
          return {
            status: 'ok',
            actionId,
            data: { results: [{ id: 'page-1', object: 'page' }] },
          };
        case 'getPage':
          return {
            status: 'ok',
            actionId,
            data: { id: subActionParams.pageId, object: 'page' },
          };
        case 'queryDataSource':
          return {
            status: 'ok',
            actionId,
            data: { results: [{ id: 'row-1' }, { id: 'row-2' }], has_more: false },
          };
        case 'getDataSource':
          return {
            status: 'ok',
            actionId,
            data: {
              id: subActionParams.dataSourceId,
              title: [{ plain_text: 'Project Tracker' }],
              properties: { Status: { type: 'select' }, Name: { type: 'title' } },
            },
          };
        default:
          throw new Error(`Unexpected Notion subAction: ${subAction}`);
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
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'source.search'),
        inputs: { query_string: 'meeting notes', query_object: 'page' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-page-by-title')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchPageOrDSByTitle',
            subActionParams: {
              query: 'meeting notes',
              queryObjectType: 'page',
              startCursor: undefined,
              pageSize: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_page workflow', () => {
    it('forwards page ID to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_page'),
        inputs: { page_id: 'abc-123-def' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-page')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getPage',
            subActionParams: { pageId: 'abc-123-def' },
          }),
        })
      );
    });
  });

  describe('query_data_source workflow', () => {
    it('forwards query parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'query_data_source'),
        inputs: { data_source_id: 'db-456', page_size: 5 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('query-data-source')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'queryDataSource',
            subActionParams: {
              dataSourceId: 'db-456',
              pageSize: 5,
              startCursor: undefined,
              filter: undefined,
            },
          }),
        })
      );
    });
  });

  describe('get_data_source workflow', () => {
    it('forwards data source ID to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'get_data_source'),
        inputs: { data_source_id: 'ds-789' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-data-source')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getDataSource',
            subActionParams: { dataSourceId: 'ds-789' },
          }),
        })
      );
    });
  });
});
