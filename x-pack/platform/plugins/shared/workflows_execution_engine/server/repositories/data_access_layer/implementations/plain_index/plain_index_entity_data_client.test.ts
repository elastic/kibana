/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { coreMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { PlainIndexEntityDataClient } from './plain_index_entity_data_client';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../constants/execution_indexes';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/step_executions_mappings';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/workflow_executions_mappings';

describe('PlainIndexEntityDataClient', () => {
  it('creates workflow and step clients backed by their system indices', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
    esClient.indices.exists.mockResolvedValue(true as never);
    esClient.indices.putMapping.mockResolvedValue({ acknowledged: true } as never);

    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    Object.defineProperty(coreStart.elasticsearch.client, 'asInternalUser', {
      configurable: true,
      value: esClient,
    });

    const logger = loggerMock.create();
    const workflow = new PlainIndexEntityDataClient({
      logger,
      indexName: WORKFLOWS_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
    });
    const step = new PlainIndexEntityDataClient({
      logger,
      indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
    });

    await expect(workflow.initSetup(coreSetup)).resolves.toBeUndefined();
    await expect(step.initSetup(coreSetup)).resolves.toBeUndefined();
    expect(coreSetup.dataStreams.registerDataStream).not.toHaveBeenCalled();

    await expect(workflow.initStart(coreStart)).resolves.toBeUndefined();
    await expect(step.initStart(coreStart)).resolves.toBeUndefined();

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: WORKFLOWS_EXECUTIONS_INDEX });
    expect(esClient.indices.exists).toHaveBeenCalledWith({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });

    const workflowExecutionsDataClient = workflow.createClient();
    const stepExecutionsDataClient = step.createClient();

    await workflowExecutionsDataClient.search({ query: { match_all: {} } });
    await stepExecutionsDataClient.search({ query: { match_all: {} } });

    expect(esClient.search).toHaveBeenNthCalledWith(1, {
      index: WORKFLOWS_EXECUTIONS_INDEX,
      query: { match_all: {} },
    });
    expect(esClient.search).toHaveBeenNthCalledWith(2, {
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      query: { match_all: {} },
    });

    await workflow.stop();
    await step.stop();
  });

  describe('index initialization retries', () => {
    const unknownResourceError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 404,
        body: { ok: false, message: 'Unknown resource.' },
      })
    );
    const serviceUnavailableError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 503,
        body: { error: { type: 'unavailable', reason: 'unavailable' } },
      })
    );

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const createClient = () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.exists.mockResolvedValue(false as never);
      const coreStart = coreMock.createStart();
      Object.defineProperty(coreStart.elasticsearch.client, 'asInternalUser', {
        configurable: true,
        value: esClient,
      });
      const logger = loggerMock.create();
      const client = new PlainIndexEntityDataClient({
        logger,
        indexName: WORKFLOWS_EXECUTIONS_INDEX,
        mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
      });

      return { client, coreStart, esClient, logger };
    };

    it('retries an unknown resource response without logging an error', async () => {
      const { client, coreStart, esClient, logger } = createClient();
      esClient.indices.create
        .mockRejectedValueOnce(unknownResourceError)
        .mockResolvedValue({ acknowledged: true } as never);

      const initialization = client.initStart(coreStart);
      await jest.advanceTimersByTimeAsync(2_000);

      await expect(initialization).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs one error when unknown resource responses continue for 20 minutes', async () => {
      const { client, coreStart, esClient, logger } = createClient();
      esClient.indices.create.mockRejectedValue(unknownResourceError);

      const initialization = expect(client.initStart(coreStart)).rejects.toBe(unknownResourceError);
      await jest.advanceTimersByTimeAsync(21 * 60 * 1000);

      await initialization;
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('keeps retrying other transient errors after 20 minutes', async () => {
      const { client, coreStart, esClient, logger } = createClient();
      const recoversAt = Date.now() + 25 * 60 * 1000;
      esClient.indices.create.mockImplementation(({ index }) =>
        Date.now() < recoversAt
          ? Promise.reject(serviceUnavailableError)
          : Promise.resolve({ acknowledged: true, shards_acknowledged: true, index: String(index) })
      );

      const initialization = client.initStart(coreStart);
      await jest.advanceTimersByTimeAsync(26 * 60 * 1000);

      await expect(initialization).resolves.toBeUndefined();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
