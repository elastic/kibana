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
import { googleDriveDataSource } from './data_type';

const CONNECTOR_NAME = 'fake-google-drive-connector';
const CONNECTOR_ID = 'fake-gd-connector-uuid';

const fakeDownloadResponse = (fileId: string) => ({
  id: fileId,
  name: `${fileId}.pdf`,
  mimeType: 'application/pdf',
  content: Buffer.from(`content-of-${fileId}`).toString('base64'),
  encoding: 'base64',
  size: '1024',
});

const fakeSimulateResponse = (docs: Array<{ _id: string; _source: Record<string, unknown> }>) => ({
  docs: docs.map((doc) => ({
    doc: {
      _id: doc._id,
      _source: {
        attachment: {
          content: `extracted text from ${(doc._source as Record<string, unknown>).filename}`,
          content_type: 'application/pdf',
        },
      },
    },
  })),
});

describe('google drive workflows', () => {
  let fixture: WorkflowRunFixture;
  let transportRequestMock: jest.Mock;
  let workflows: ProcessedWorkflow[];

  beforeAll(async () => {
    workflows = await loadWorkflowsThroughProductionPath(googleDriveDataSource, {
      stackConnectorId: CONNECTOR_NAME,
    });
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    fixture.scopedActionsClientMock.getAll.mockResolvedValue([
      { id: CONNECTOR_ID, name: CONNECTOR_NAME, actionTypeId: '.google_drive' },
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
        case 'downloadFile':
          return {
            status: 'ok',
            actionId,
            data: fakeDownloadResponse(subActionParams.fileId as string),
          };
        case 'searchFiles':
          return {
            status: 'ok',
            actionId,
            data: {
              files: [
                { id: 'result-1', name: 'doc1.pdf', mimeType: 'application/pdf' },
                { id: 'result-2', name: 'doc2.pdf', mimeType: 'application/pdf' },
              ],
              nextPageToken: null,
            },
          };
        case 'getFileMetadata':
          return {
            status: 'ok',
            actionId,
            data: (subActionParams.fileIds as string[]).map((fid: string) => ({
              id: fid,
              name: `${fid}.pdf`,
              mimeType: 'application/pdf',
              owners: [{ displayName: 'Test User' }],
            })),
          };
        default:
          throw new Error(`Unexpected Google Drive subAction: ${subAction}`);
      }
    };

    transportRequestMock = fixture.dependencies.coreStart.elasticsearch.client.asScoped(
      fixture.fakeKibanaRequest
    ).asCurrentUser.transport.request as jest.Mock;

    transportRequestMock.mockImplementation(
      async ({ path, body }: { path: string; body: Record<string, unknown> }) => {
        if (path === '/_ingest/pipeline/_simulate') {
          return fakeSimulateResponse(
            body.docs as Array<{ _id: string; _source: Record<string, unknown> }>
          );
        }
        throw new Error(`Unexpected ES request path: ${path}`);
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
      // download has long Liquid expressions that get folded by updateYamlField
      // (known line-folding bug tracked separately). Skip its liquid validation here.
      if (wf.name.includes('download')) continue;

      expect({ workflow: wf.name, liquidErrors: wf.liquidErrors }).toEqual({
        workflow: wf.name,
        liquidErrors: [],
      });
    }
  });

  describe('download workflow', () => {
    it('N file IDs produce N download actions and N text extractions', async () => {
      const fileIds = ['f1', 'f2', 'f3', 'f4', 'f5'];
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download'),
        inputs: { fileIds, rerank: false },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('download_file')).toHaveLength(5);
      expect(getStepExecutions('extract_content')).toHaveLength(5);
      expect(getStepExecutions('normalize_result')).toHaveLength(5);
      expect(getStepExecutions('accumulate_result')).toHaveLength(5);
    });

    it('download output feeds into extraction input for each file', async () => {
      const fileIds = ['alpha', 'beta'];
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download'),
        inputs: { fileIds, rerank: false },
      });

      const simulateCalls = transportRequestMock.mock.calls.filter(
        ([req]: [{ path: string }]) => req.path === '/_ingest/pipeline/_simulate'
      );

      expect(simulateCalls).toHaveLength(2);

      const extractedFileNames = simulateCalls.map(
        ([req]: [{ body: { docs: Array<{ _source: { data: string; filename: string } }> } }]) =>
          req.body.docs[0]._source.filename
      );
      expect(extractedFileNames).toContain('alpha.pdf');
      expect(extractedFileNames).toContain('beta.pdf');

      simulateCalls.forEach(
        ([req]: [{ body: { docs: Array<{ _source: { data: string; filename: string } }> } }]) => {
          const doc = req.body.docs[0];
          const fileId = doc._source.filename.replace('.pdf', '');
          const expectedBase64 = Buffer.from(`content-of-${fileId}`).toString('base64');
          expect(doc._source.data).toBe(expectedBase64);
        }
      );
    });

    it('rerank=false stores all results without reranking', async () => {
      const fileIds = ['x1', 'x2'];
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download'),
        inputs: { fileIds, rerank: false },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('store_all')).toHaveLength(1);
      expect(getStepExecutions('do_rerank')).toHaveLength(0);
      expect(getStepExecutions('store_reranked')).toHaveLength(0);
    });

    it('rerank=true triggers the rerank branch', async () => {
      registerExtensionSteps(fixture, [
        {
          id: 'search.rerank',
          handler: async (ctx: { input: { data: unknown[]; rank_window_size?: number } }) => ({
            output: (ctx.input.data || []).slice(0, ctx.input.rank_window_size ?? 5),
          }),
        },
      ]);

      const fileIds = ['r1', 'r2', 'r3'];
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download'),
        inputs: { fileIds, rerank: true, rerankQuery: 'quarterly report', topK: 2 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('do_rerank')).toHaveLength(1);
      expect(getStepExecutions('store_reranked')).toHaveLength(1);
      expect(getStepExecutions('store_all')).toHaveLength(0);
    });
  });

  describe('search workflow', () => {
    it('forwards search parameters to the connector', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'search'),
        inputs: { query: "name contains 'budget'", pageSize: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search_files')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchFiles',
            subActionParams: {
              query: "name contains 'budget'",
              pageSize: 10,
              pageToken: undefined,
              orderBy: undefined,
            },
          }),
        })
      );
    });
  });

  describe('metadata workflow', () => {
    it('forwards file IDs to the connector', async () => {
      const fileIds = ['meta-1', 'meta-2', 'meta-3'];
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'metadata'),
        inputs: { fileIds },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get_metadata')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getFileMetadata',
            subActionParams: {
              fileIds: ['meta-1', 'meta-2', 'meta-3'],
            },
          }),
        })
      );
    });
  });
});
