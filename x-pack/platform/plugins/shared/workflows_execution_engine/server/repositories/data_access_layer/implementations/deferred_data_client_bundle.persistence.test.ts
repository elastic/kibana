/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import {
  WORKFLOWS_EXECUTIONS_DATA_STREAM,
  WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
} from './data_stream/constants';
import { DeferredDataClientBundle } from './deferred_data_client_bundle';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../constants/execution_indexes';

describe('DeferredDataClientBundle persistence', () => {
  it('writes workflow and step executions to the selected store, including after switching back', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.exists.mockResolvedValue(true as never);
    esClient.indices.putSettings.mockResolvedValue({ acknowledged: true } as never);
    esClient.indices.putMapping.mockResolvedValue({ acknowledged: true } as never);
    esClient.indices.getDataStream.mockImplementation(async (params) => {
      const requestedName = Array.isArray(params?.name) ? params.name[0] : params?.name;
      return {
        data_streams: [
          {
            name: requestedName,
            lifecycle: { data_retention: '90d' },
            indices: [{ index_name: `.ds-${requestedName}-000001` }],
          },
        ],
      } as never;
    });
    esClient.bulk.mockImplementation(async (request) => {
      const action = request?.operations?.[0] as { create?: { _id?: string; _index?: string } };
      return {
        errors: false,
        took: 1,
        items: [
          {
            create: {
              _id: action.create?._id,
              _index: action.create?._index,
              result: 'created',
              status: 201,
            },
          },
        ],
      } as never;
    });

    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    Object.defineProperty(coreStart.elasticsearch.client, 'asInternalUser', {
      configurable: true,
      value: esClient,
    });

    const bundle = new DeferredDataClientBundle({
      source: 'plain_index',
      dataRetention: '90d',
      logger: loggerMock.create(),
    });

    await bundle.initSetup(coreSetup);
    await bundle.initStart(coreStart);

    const workflowClient = bundle.createWorkflowDataClient();
    const stepClient = bundle.createStepDataClient();
    const createdAt = '2024-01-01T00:00:00.000Z';

    const writtenIndex = async (write: () => Promise<unknown>): Promise<string | undefined> => {
      esClient.bulk.mockClear();
      await write();
      const action = esClient.bulk.mock.calls[0]?.[0]?.operations?.[0] as
        | { create?: { _index?: string } }
        | undefined;
      return action?.create?._index;
    };

    await expect(
      writtenIndex(() =>
        workflowClient.bulk({
          items: [{ operation: 'create', document: { id: 'wf-1', createdAt } }],
        })
      )
    ).resolves.toBe(WORKFLOWS_EXECUTIONS_INDEX);
    await expect(
      writtenIndex(() =>
        stepClient.bulk({
          items: [{ operation: 'create', document: { id: 'step-1', startedAt: createdAt } }],
        })
      )
    ).resolves.toBe(WORKFLOWS_STEP_EXECUTIONS_INDEX);

    await bundle.switchSource('data_stream');

    await expect(
      writtenIndex(() =>
        workflowClient.bulk({
          items: [{ operation: 'create', document: { id: 'wf-2', createdAt } }],
        })
      )
    ).resolves.toBe(WORKFLOWS_EXECUTIONS_DATA_STREAM);
    await expect(
      writtenIndex(() =>
        stepClient.bulk({
          items: [{ operation: 'create', document: { id: 'step-2', startedAt: createdAt } }],
        })
      )
    ).resolves.toBe(WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM);

    await bundle.switchSource('plain_index');

    await expect(
      writtenIndex(() =>
        workflowClient.bulk({
          items: [{ operation: 'create', document: { id: 'wf-3', createdAt } }],
        })
      )
    ).resolves.toBe(WORKFLOWS_EXECUTIONS_INDEX);
    await expect(
      writtenIndex(() =>
        stepClient.bulk({
          items: [{ operation: 'create', document: { id: 'step-3', startedAt: createdAt } }],
        })
      )
    ).resolves.toBe(WORKFLOWS_STEP_EXECUTIONS_INDEX);

    await bundle.stop();
  });
});
