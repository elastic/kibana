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
import { sharepointOnlineDataSource } from '../data_type';

const CONNECTOR_NAME = 'fake-sharepoint-connector';
const CONNECTOR_ID = 'fake-sp-connector-uuid';

const TINY_PDF_BASE64 = Buffer.from(
  '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n' +
    'xref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF'
).toString('base64');

describe('sharepoint online workflows (real ES)', () => {
  let esCluster: EsTestCluster;
  let esClient: Client;
  let fixture: WorkflowRunFixture;
  let workflows: ProcessedWorkflow[];

  beforeAll(async () => {
    jest.setTimeout(5 * 60_000);

    workflows = await loadWorkflowsThroughProductionPath(sharepointOnlineDataSource, {
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

      if (subAction === 'downloadItemFromURL') {
        return {
          status: 'ok',
          actionId,
          data: {
            base64: TINY_PDF_BASE64,
            mimeType: 'application/pdf',
          },
        };
      }

      throw new Error(`Unexpected SharePoint subAction: ${subAction}`);
    };
  });

  const getStepExecutions = (stepId: string) =>
    Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
      (se) => se.stepId === stepId
    );

  const getWorkflowExecution = () =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  describe('download workflow (downloadItemFromURL) with real ES extraction', () => {
    it('_ingest/pipeline/_simulate extracts text from the attachment processor', async () => {
      await fixture.runWorkflow({
        workflowYaml: getWorkflowYaml(workflows, 'download'),
        inputs: { download_action: 'downloadItemFromURL', download_url: 'https://sp/file.pdf' },
      });

      const execution = getWorkflowExecution();
      expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

      expect(getStepExecutions('download-item-from-url')).toHaveLength(1);
      expect(getStepExecutions('extract-content')).toHaveLength(1);
    }, 60_000);
  });
});
