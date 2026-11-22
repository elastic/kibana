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

import { PlainIndexDataClientBundle } from './plain_index_data_client_bundle';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../constants/execution_indexes';

describe('PlainIndexDataClientBundle', () => {
  it('creates workflow and step DAL instances backed by their system indices', async () => {
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
    const bundle = new PlainIndexDataClientBundle({
      source: 'plain_index',
      dataRetention: '90d',
      logger,
    });

    await expect(bundle.initSetup(coreSetup)).resolves.toBeUndefined();
    await expect(bundle.initStart(coreStart)).resolves.toBeUndefined();

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: WORKFLOWS_EXECUTIONS_INDEX });
    expect(esClient.indices.exists).toHaveBeenCalledWith({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });

    const workflowExecutionsDataClient = bundle.createWorkflowDataClient();
    const stepExecutionsDataClient = bundle.createStepDataClient();

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
  });

  describe('index initialization retries', () => {
    const unknownResourceError = new EsErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 404,
        body: { ok: false, message: 'Unknown resource.' },
      })
    );

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const createBundle = () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      const coreStart = coreMock.createStart();
      Object.defineProperty(coreStart.elasticsearch.client, 'asInternalUser', {
        configurable: true,
        value: esClient,
      });
      const logger = loggerMock.create();
      const bundle = new PlainIndexDataClientBundle({
        source: 'plain_index',
        dataRetention: '90d',
        logger,
      });

      return { bundle, coreStart, esClient, logger };
    };

    it('retries an unknown resource response without logging an error', async () => {
      const { bundle, coreStart, esClient, logger } = createBundle();
      esClient.indices.exists
        .mockRejectedValueOnce(unknownResourceError)
        .mockResolvedValue(true as never);

      const initialization = bundle.initStart(coreStart);
      await jest.advanceTimersByTimeAsync(2_000);

      await expect(initialization).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs an error when unknown resource responses continue for 20 minutes', async () => {
      const { bundle, coreStart, esClient, logger } = createBundle();
      esClient.indices.exists.mockRejectedValue(unknownResourceError);

      const initialization = expect(bundle.initStart(coreStart)).rejects.toBe(unknownResourceError);
      await jest.advanceTimersByTimeAsync(0);
      jest.setSystemTime(Date.now() + 20 * 60 * 1000);
      await jest.advanceTimersByTimeAsync(2_000);

      await initialization;
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('stops waiting when the plugin stops', async () => {
      const { bundle, coreStart, esClient, logger } = createBundle();
      esClient.indices.exists.mockRejectedValue(unknownResourceError);

      const initialization = bundle.initStart(coreStart);
      await Promise.resolve();
      await bundle.stop();

      await expect(initialization).resolves.toBeUndefined();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs a nonretryable initialization error once', async () => {
      const { bundle, coreStart, esClient, logger } = createBundle();
      const error = new Error('mapping conflict');
      esClient.indices.exists.mockRejectedValue(error);

      await expect(bundle.initStart(coreStart)).rejects.toBe(error);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
