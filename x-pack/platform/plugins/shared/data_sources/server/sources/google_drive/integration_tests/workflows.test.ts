/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '@kbn/workflows-execution-engine/integration_tests/workflow_run_fixture';
import {
  loadWorkflowsThroughProductionPath,
  getWorkflowYaml,
  type ProcessedWorkflow,
} from '../../workflow.test_helpers';
import { googleDriveDataSource } from '../data_type';

const CONNECTOR_NAME = 'fake-google-drive-connector';
const CONNECTOR_ID = 'fake-gd-connector-uuid';

const TINY_PDF_BASE64 = Buffer.from(
  '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n' +
    'xref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF'
).toString('base64');

describe('google drive workflows (real ES)', () => {
  let esCluster: EsTestCluster;
  let esClient: Client;
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(async () => {
    jest.setTimeout(5 * 60_000);

    workflows = await loadWorkflowsThroughProductionPath(googleDriveDataSource, {
      stackConnectorId: CONNECTOR_NAME,
    });

    esCluster = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
      esArgs: ['xpack.ml.enabled=false'],
    });
    await esCluster.start();
    esClient = esCluster.getClient();
  });

  afterAll(async () => {
    await esClient?.close();
    await esCluster?.cleanup();
  });

  beforeEach(() => {
    fixture = new WorkflowRunFixture();

    const scopedClientMock = fixture.dependencies.coreStart.elasticsearch.client.asScoped(
      fixture.fakeKibanaRequest
    );
    (scopedClientMock.asCurrentUser as unknown) = esClient;

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

      if (subAction === 'downloadFile') {
        return {
          status: 'ok',
          actionId,
          data: {
            id: subActionParams.fileId,
            name: `${subActionParams.fileId}.pdf`,
            mimeType: 'application/pdf',
            content: TINY_PDF_BASE64,
            encoding: 'base64',
            size: '1024',
          },
        };
      }

      throw new Error(`Unexpected Google Drive subAction: ${subAction}`);
    };
  });

  const getStepExecutions = (stepId: string) =>
    Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
      (se) => se.stepId === stepId
    );

  const getWorkflowExecution = () =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  describe('download workflow with real ES extraction', () => {
    it('_ingest/pipeline/_simulate returns real extracted text from attachment processor', async () => {
      const fileIds = ['file-alpha', 'file-beta'];
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download'),
        inputs: { fileIds, rerank: false },
      });

      const execution = getWorkflowExecution();
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

      expect(getStepExecutions('download_file')).toHaveLength(2);
      expect(getStepExecutions('extract_content')).toHaveLength(2);
      expect(getStepExecutions('normalize_result')).toHaveLength(2);
      expect(getStepExecutions('accumulate_result')).toHaveLength(2);

      const normalizeSteps = getStepExecutions('normalize_result');
      for (const step of normalizeSteps) {
        const vars = (step as unknown as Record<string, unknown>).variables as Record<
          string,
          unknown
        >;
        const normalized = vars?.normalized as Record<string, unknown> | undefined;
        if (normalized) {
          expect(normalized.filename).toMatch(/\.pdf$/);
        }
      }
    }, 60_000);

    it('handles multiple files through the foreach loop with real extraction', async () => {
      const fileIds = ['doc-1', 'doc-2', 'doc-3'];
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download'),
        inputs: { fileIds, rerank: false },
      });

      expect(getWorkflowExecution()?.status).toBe(ExecutionStatus.COMPLETED);
      expect(getStepExecutions('download_file')).toHaveLength(3);
      expect(getStepExecutions('extract_content')).toHaveLength(3);
    }, 60_000);
  });
});
