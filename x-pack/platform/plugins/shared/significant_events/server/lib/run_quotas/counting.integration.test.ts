/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { ExecutionStatus, ExecutionStatusValues } from '@kbn/workflows';
import { WORKFLOWS_EXECUTIONS_INDEX } from '@kbn/workflows-management-plugin/common';
import { countRunQuotaWorkflowExecutions, RUN_QUOTA_WORKFLOW_IDS_BY_GROUP } from './counting';

jest.setTimeout(120_000);

describe('run quota workflow execution display counting', () => {
  let esServer: EsTestCluster;
  let esClient: ElasticsearchClient;

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'error' }),
    });
    await esServer.start();
    esClient = esServer.getClient();
    await esClient.indices.create({
      index: WORKFLOWS_EXECUTIONS_INDEX,
      settings: { index: { hidden: true } },
      mappings: {
        properties: {
          workflowId: { type: 'keyword' },
          createdAt: { type: 'date' },
          isTestRun: { type: 'boolean' },
          status: { type: 'keyword' },
        },
      },
    });
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  beforeEach(async () => {
    await esClient.deleteByQuery({
      index: WORKFLOWS_EXECUTIONS_INDEX,
      conflicts: 'proceed',
      refresh: true,
      query: { match_all: {} },
    });
  });

  const window = {
    start: '2026-08-31T00:00:00.000Z',
    resetsAt: '2026-09-01T00:00:00.000Z',
    timezone: 'UTC' as const,
  };

  const indexDocuments = async (
    documents: Array<{
      workflowId: string;
      createdAt?: string;
      isTestRun?: boolean;
      status: ExecutionStatus;
    }>
  ) => {
    await esClient.bulk({
      refresh: true,
      operations: documents.flatMap((document) => [
        { index: { _index: WORKFLOWS_EXECUTIONS_INDEX } },
        {
          createdAt: '2026-08-31T12:00:00.000Z',
          ...document,
        },
      ]),
    });
  };

  it('counts every execution status except skipped', async () => {
    await indexDocuments(
      ExecutionStatusValues.map((status) => ({
        workflowId: RUN_QUOTA_WORKFLOW_IDS_BY_GROUP.detection[0],
        isTestRun: false,
        status,
      }))
    );

    const counts = await countRunQuotaWorkflowExecutions({ esClient, window });

    expect(counts.detection).toBe(
      ExecutionStatusValues.filter((status) => status !== ExecutionStatus.SKIPPED).length
    );
  });

  it('counts false or missing test-run fields but excludes true and out-of-window rows', async () => {
    const workflowId = RUN_QUOTA_WORKFLOW_IDS_BY_GROUP.ki_extraction[0];
    await indexDocuments([
      { workflowId, status: ExecutionStatus.COMPLETED },
      { workflowId, isTestRun: false, status: ExecutionStatus.COMPLETED },
      { workflowId, isTestRun: true, status: ExecutionStatus.COMPLETED },
      {
        workflowId,
        isTestRun: false,
        status: ExecutionStatus.COMPLETED,
        createdAt: '2026-08-30T23:59:59.999Z',
      },
      {
        workflowId,
        isTestRun: false,
        status: ExecutionStatus.COMPLETED,
        createdAt: window.resetsAt,
      },
    ]);

    const counts = await countRunQuotaWorkflowExecutions({ esClient, window });

    expect(counts.ki_extraction).toBe(2);
  });

  it('maps every counted workflow id into its display group', async () => {
    await indexDocuments(
      Object.values(RUN_QUOTA_WORKFLOW_IDS_BY_GROUP).flatMap((workflowIds) =>
        workflowIds.map((workflowId) => ({
          workflowId,
          isTestRun: false,
          status: ExecutionStatus.RUNNING,
        }))
      )
    );

    const counts = await countRunQuotaWorkflowExecutions({ esClient, window });

    expect(counts).toEqual({
      detection: RUN_QUOTA_WORKFLOW_IDS_BY_GROUP.detection.length,
      investigation: RUN_QUOTA_WORKFLOW_IDS_BY_GROUP.investigation.length,
      ki_extraction: RUN_QUOTA_WORKFLOW_IDS_BY_GROUP.ki_extraction.length,
      memory: RUN_QUOTA_WORKFLOW_IDS_BY_GROUP.memory.length,
    });
  });
});
