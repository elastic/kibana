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

const CONNECTOR_NAME = 'fake-notion-connector';
const CONNECTOR_ID = 'fake-notion-connector-uuid';

const loadWorkflow = (file: string): string =>
  loadDataSourceWorkflow('notion', file, {
    'notion-stack-connector-id': CONNECTOR_NAME,
  });

describe('notion workflows', () => {
  let fixture: WorkflowRunFixture;

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
            data: {
              results: [{ id: 'page-1', object: 'page', properties: { title: 'Test Page' } }],
            },
          };
        case 'getPage':
          return {
            status: 'ok',
            actionId,
            data: {
              id: subActionParams.pageId,
              object: 'page',
              properties: { title: { title: [{ plain_text: 'My Page' }] } },
            },
          };
        case 'getDataSource':
          return {
            status: 'ok',
            actionId,
            data: {
              id: subActionParams.dataSourceId,
              object: 'database',
              title: [{ plain_text: 'My Database' }],
              properties: { Name: { type: 'title' }, Status: { type: 'select' } },
            },
          };
        case 'queryDataSource':
          return {
            status: 'ok',
            actionId,
            data: {
              results: [
                { id: 'row-1', properties: { Name: { title: [{ plain_text: 'Item 1' }] } } },
                { id: 'row-2', properties: { Name: { title: [{ plain_text: 'Item 2' }] } } },
              ],
              has_more: false,
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

  describe('search workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('search.yaml'),
        inputs: { query_string: 'meeting notes', query_object: 'page' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search-page-by-title')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchPageOrDSByTitle',
            subActionParams: expect.objectContaining({
              query: 'meeting notes',
              queryObjectType: 'page',
            }),
          }),
        })
      );
    });
  });

  describe('get_page workflow', () => {
    it('forwards page ID to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('get_page.yaml'),
        inputs: { page_id: 'abc-123-def' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-page')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getPage',
            subActionParams: expect.objectContaining({ pageId: 'abc-123-def' }),
          }),
        })
      );
    });
  });

  describe('query_data_source workflow', () => {
    it('forwards query parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('query_data_source.yaml'),
        inputs: { data_source_id: 'db-456', page_size: 5 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('query-data-source')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'queryDataSource',
            subActionParams: expect.objectContaining({
              dataSourceId: 'db-456',
              pageSize: 5,
            }),
          }),
        })
      );
    });
  });
});
