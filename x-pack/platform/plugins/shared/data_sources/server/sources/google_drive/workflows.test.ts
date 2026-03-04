/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '../../../../../../../../src/platform/plugins/shared/workflows_execution_engine/integration_tests/workflow_run_fixture';
import { renderWorkflowTemplate } from '../workflow_test_helpers';

const CONNECTOR_NAME = 'fake-google-drive-connector';
const CONNECTOR_ID = 'fake-gd-connector-uuid';

const loadWorkflow = (file: string): string =>
  renderWorkflowTemplate(readFileSync(resolve(__dirname, 'workflows', file), 'utf-8'), {
    'google_drive-stack-connector-id': CONNECTOR_NAME,
  });

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

    transportRequestMock = fixture.dependencies.coreStart.elasticsearch.client.asScoped()
      .asCurrentUser.transport.request as jest.Mock;

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

  describe('download workflow', () => {
    it('N file IDs produce N download actions and N text extractions', async () => {
      const fileIds = ['f1', 'f2', 'f3', 'f4', 'f5'];
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('download.yaml'),
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
        workflowYaml: loadWorkflow('download.yaml'),
        inputs: { fileIds, rerank: false },
      });

      const simulateCalls = transportRequestMock.mock.calls.filter(
        ([req]: [{ path: string }]) => req.path === '/_ingest/pipeline/_simulate'
      );

      expect(simulateCalls).toHaveLength(2);

      simulateCalls.forEach(([req]: [{ body: { docs: Array<{ _source: { data: string; filename: string } }> } }]) => {
        const doc = req.body.docs[0];
        expect(doc._source.data).toBeDefined();
        expect(doc._source.data.length).toBeGreaterThan(0);
        expect(doc._source.filename).toMatch(/\.pdf$/);
      });
    });

    it('rerank=true triggers the rerank branch', async () => {
      const workflowsExtensions = fixture.dependencies.workflowsExtensions;
      (workflowsExtensions.hasStepDefinition as jest.Mock).mockImplementation(
        (type: string) => type === 'search.rerank'
      );
      (workflowsExtensions.getStepDefinition as jest.Mock).mockImplementation(
        (type: string) => {
          if (type === 'search.rerank') {
            return {
              id: 'search.rerank',
              handler: async (ctx: { input: { data: unknown[]; rank_window_size?: number } }) => ({
                output: (ctx.input.data || []).slice(0, ctx.input.rank_window_size ?? 5),
              }),
            };
          }
          return undefined;
        }
      );

      const fileIds = ['r1', 'r2', 'r3'];
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('download.yaml'),
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
        workflowYaml: loadWorkflow('search.yaml'),
        inputs: { query: "name contains 'budget'", pageSize: 10 },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('search_files')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'searchFiles',
            subActionParams: expect.objectContaining({
              query: "name contains 'budget'",
              pageSize: 10,
            }),
          }),
        })
      );
    });
  });

  describe('metadata workflow', () => {
    it('forwards file IDs to the connector', async () => {
      const fileIds = ['meta-1', 'meta-2', 'meta-3'];
      await fixture.runWorkflow({
        workflowYaml: loadWorkflow('metadata.yaml'),
        inputs: { fileIds },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('get_metadata')).toHaveLength(1);

      expect(fixture.scopedActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            subAction: 'getFileMetadata',
            subActionParams: expect.objectContaining({
              fileIds: ['meta-1', 'meta-2', 'meta-3'],
            }),
          }),
        })
      );
    });
  });
});
