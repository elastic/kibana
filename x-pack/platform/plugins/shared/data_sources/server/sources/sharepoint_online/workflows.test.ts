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
  type ProcessedWorkflow,
} from '../workflow.test_helpers';

const CONNECTOR_NAME = 'fake-sharepoint-connector';
const CONNECTOR_ID = 'fake-sp-connector-uuid';

describe('sharepoint online workflows', () => {
  let fixture: WorkflowRunFixture;
  let transportRequestMock: jest.Mock;
  let workflows: ProcessedWorkflow[];

  beforeAll(() => {
    workflows = loadWorkflowsFromConnectorSpec('.sharepoint-online', {
      connectorName: CONNECTOR_NAME,
    });
  });

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

      switch (subAction) {
        case 'downloadDriveItem':
          return {
            status: 'ok',
            actionId,
            data: { content: 'markdown content', mimeType: 'text/markdown' },
          };
        case 'downloadItemFromURL':
          return {
            status: 'ok',
            actionId,
            data: {
              base64: Buffer.from('pdf binary').toString('base64'),
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
            data: { value: [{ resource: { id: 'r1', name: 'doc.docx' } }] },
          };
        case 'getDriveItems':
          return {
            status: 'ok',
            actionId,
            data: { value: [{ id: 'item1', name: 'file.txt' }] },
          };
        case 'getAllSites':
          return {
            status: 'ok',
            actionId,
            data: { value: [{ id: 'site-1', displayName: 'Team Site' }] },
          };
        case 'getSite':
          return {
            status: 'ok',
            actionId,
            data: { id: 'site-1', displayName: 'Team Site', webUrl: 'https://sp/sites/team' },
          };
        case 'getSitePages':
          return {
            status: 'ok',
            actionId,
            data: { value: [{ id: 'page-1', title: 'Home' }] },
          };
        case 'getSiteDrives':
          return {
            status: 'ok',
            actionId,
            data: { value: [{ id: 'drv-1', name: 'Documents' }] },
          };
        case 'getSiteLists':
          return {
            status: 'ok',
            actionId,
            data: { value: [{ id: 'list-1', displayName: 'Tasks' }] },
          };
        case 'getSiteListItems':
          return {
            status: 'ok',
            actionId,
            data: { value: [{ id: 'item-1', fields: { Title: 'Task 1' } }] },
          };
        default:
          throw new Error(`Unexpected SharePoint subAction: ${subAction}`);
      }
    };

    transportRequestMock = fixture.dependencies.coreStart.elasticsearch.client.asScoped(
      fixture.fakeKibanaRequest
    ).asCurrentUser.transport.request as jest.Mock;

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

  it('all workflows pass production validation without liquid template errors', () => {
    for (const wf of workflows) {
      expect({ workflow: wf.name, liquidErrors: wf.liquidErrors }).toEqual({
        workflow: wf.name,
        liquidErrors: [],
      });
    }
  });

  describe('download workflow', () => {
    it('downloadDriveItem path calls connector with drive and item IDs', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download'),
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
            subActionParams: { driveId: 'drv-1', itemId: 'itm-1' },
          }),
        })
      );
    });

    it('downloadItemFromURL path calls connector then ES extraction with correct data', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download'),
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

      const doc = simulateCalls[0][0].body.docs[0];
      expect(doc._source.data).toBe(Buffer.from('pdf binary').toString('base64'));
      expect(doc._source.filename).toBe('https://sp/file.pdf');
    });

    it('getSitePageContents path calls connector with site and page IDs', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download'),
        inputs: { download_action: 'getSitePageContents', site_id: 'site-1', page_id: 'page-1' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-site-page-contents')).toHaveLength(1);
      expect(getStepExecutions('download-drive-item')).toHaveLength(0);
      expect(getStepExecutions('download-item-from-url')).toHaveLength(0);
      expect(getStepExecutions('extract-content')).toHaveLength(0);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getSitePageContents',
            subActionParams: { siteId: 'site-1', pageId: 'page-1' },
          }),
        })
      );
    });
  });

  describe('search workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { query: 'quarterly report', entity_types: ['driveItem'], region: 'EUR' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'search',
            subActionParams: {
              query: 'quarterly report',
              entityTypes: ['driveItem'],
              region: 'EUR',
              from: undefined,
              size: 3,
            },
          }),
        })
      );
    });
  });

  describe('list workflow', () => {
    it('getAllSites calls connector with no parameters', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'getAllSites' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-all-sites')).toHaveLength(1);
      expect(getStepExecutions('get-drive-items')).toHaveLength(0);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getAllSites',
          }),
        })
      );
    });

    it('getSite by ID routes to get-site-by-id with siteId', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'getSite', site_id: 'site-abc' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-site-by-id')).toHaveLength(1);
      expect(getStepExecutions('get-site-by-relative-url')).toHaveLength(0);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getSite',
            subActionParams: { siteId: 'site-abc', relativeUrl: undefined },
          }),
        })
      );
    });

    it('getSite by relative URL routes to get-site-by-relative-url', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'getSite', relative_url: '/sites/team' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-site-by-relative-url')).toHaveLength(1);
      expect(getStepExecutions('get-site-by-id')).toHaveLength(0);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getSite',
            subActionParams: { siteId: undefined, relativeUrl: '/sites/team' },
          }),
        })
      );
    });

    it('getSitePages calls connector with site ID', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'getSitePages', site_id: 'site-xyz' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-site-pages')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getSitePages',
            subActionParams: { siteId: 'site-xyz' },
          }),
        })
      );
    });

    it('getSiteListItems calls connector with site ID and list ID', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'getSiteListItems', site_id: 'site-1', list_id: 'list-99' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-site-list-items')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getSiteListItems',
            subActionParams: { siteId: 'site-1', listId: 'list-99' },
          }),
        })
      );
    });

    it('getDriveItems calls connector with drive ID and path', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'list'),
        inputs: { list_action: 'getDriveItems', drive_id: 'drv-abc', path: '/Documents' },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get-drive-items')).toHaveLength(1);
      expect(getStepExecutions('get-all-sites')).toHaveLength(0);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getDriveItems',
            subActionParams: { driveId: 'drv-abc', path: '/Documents' },
          }),
        })
      );
    });
  });
});
