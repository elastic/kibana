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

const CONNECTOR_NAME = 'fake-sharepoint-connector';
const CONNECTOR_ID = 'fake-sp-connector-uuid';

const loadWorkflow = (file: string): string =>
  loadDataSourceWorkflow('sharepoint_online', file, {
    'sharepoint-online-stack-connector-id': CONNECTOR_NAME,
  });

describe('sharepoint online workflows', () => {
  let fixture: WorkflowRunFixture;
  let transportRequestMock: jest.Mock;

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.sharepoint-online' },
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
        case 'downloadDriveItem':
          return {
            status: 'ok',
            actionId,
            data: {
              content: `markdown content of item ${subActionParams.itemId}`,
              mimeType: 'text/markdown',
            },
          };
        case 'downloadItemFromURL':
          return {
            status: 'ok',
            actionId,
            data: {
              base64: Buffer.from('pdf binary content').toString('base64'),
              mimeType: 'application/pdf',
            },
          };
        case 'getSitePageContents':
          return {
            status: 'ok',
            actionId,
            data: { content: '<div>page html</div>', title: 'Test Page' },
          };
        case 'search':
          return {
            status: 'ok',
            actionId,
            data: {
              value: [
                { resource: { id: 'r1', name: 'doc.docx', webUrl: 'https://sp/doc.docx' } },
              ],
            },
          };
        case 'getDriveItems':
          return {
            status: 'ok',
            actionId,
            data: {
              value: [
                { id: 'item1', name: 'file.txt', webUrl: 'https://sp/file.txt' },
              ],
            },
          };
        case 'getAllSites':
          return { status: 'ok', actionId, data: { value: [{ id: 's1', name: 'Site A' }] } };
        default:
          throw new Error(`Unexpected SharePoint subAction: ${subAction}`);
      }
    };

    transportRequestMock = fixture.dependencies.coreStart.elasticsearch.client.asScoped()
      .asCurrentUser.transport.request as jest.Mock;

    transportRequestMock.mockImplementation(
      async ({ path, body }: { path: string; body: Record<string, unknown> }) => {
        if (path === '/_ingest/pipeline/_simulate') {
          return {
            docs: (body.docs as Array<{ _id: string; _source: Record<string, unknown> }>).map(
              (doc) => ({
                doc: {
                  _id: doc._id,
                  _source: {
                    attachment: {
                      content: `extracted: ${(doc._source as Record<string, unknown>).filename}`,
                      content_type: 'application/pdf',
                    },
                  },
                },
              })
            ),
          };
        }
        throw new Error(`Unexpected ES request: ${path}`);
      }
    );
  });

  const getStepExecutions = (stepId: string) =>
    Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
      (se) => se.stepId === stepId
    );

  const getWorkflowExecution = () =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  describe('download workflow', () => {
    it('downloadDriveItem path calls connector with drive and item IDs', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('download.yaml'),
        inputs: { download_action: 'downloadDriveItem', drive_id: 'drv-1', item_id: 'itm-1' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('download-drive-item')).toHaveLength(1);
      expect(getStepExecutions('download-item-from-url')).toHaveLength(0);
      expect(getStepExecutions('get-site-page-contents')).toHaveLength(0);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'downloadDriveItem',
            subActionParams: expect.objectContaining({
              driveId: 'drv-1',
              itemId: 'itm-1',
            }),
          }),
        })
      );
    });

    it('downloadItemFromURL path calls connector then ES extraction', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('download.yaml'),
        inputs: { download_action: 'downloadItemFromURL', download_url: 'https://sp/file.pdf' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('download-drive-item')).toHaveLength(0);
      expect(getStepExecutions('download-item-from-url')).toHaveLength(1);
      expect(getStepExecutions('extract-content')).toHaveLength(1);

      const simulateCalls = transportRequestMock.mock.calls.filter(
        ([req]: [{ path: string }]) => req.path === '/_ingest/pipeline/_simulate'
      );
      expect(simulateCalls).toHaveLength(1);
      expect(simulateCalls[0][0].body.docs[0]._source.data).toBeDefined();
    });
  });

  describe('search workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('search.yaml'),
        inputs: { query: 'quarterly report', entity_types: ['driveItem'], region: 'EUR' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'search',
            subActionParams: expect.objectContaining({
              query: 'quarterly report',
              entityTypes: ['driveItem'],
              region: 'EUR',
            }),
          }),
        })
      );
    });
  });

  describe('list workflow', () => {
    it('getDriveItems path calls connector with drive ID and path', async () => {
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('list.yaml'),
        inputs: { list_action: 'getDriveItems', drive_id: 'drv-abc', path: '/Documents' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-drive-items')).toHaveLength(1);
      expect(getStepExecutions('get-all-sites')).toHaveLength(0);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getDriveItems',
            subActionParams: expect.objectContaining({
              driveId: 'drv-abc',
              path: '/Documents',
            }),
          }),
        })
      );
    });
  });
});
