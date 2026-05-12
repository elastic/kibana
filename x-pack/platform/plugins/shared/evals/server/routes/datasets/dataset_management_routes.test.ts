/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import {
  API_VERSIONS,
  EVALS_DATASET_VERSION_TAG_URL,
  EVALS_DATASET_VERSIONS_URL,
  EVALS_DATASET_STATS_URL,
  EVALS_DATASET_EXAMPLE_SPLITS_URL,
  EVALS_DATASET_IMPORT_URL,
} from '@kbn/evals-common';
import type { RouteDependencies } from '../register_routes';
import { registerVersionDatasetRoute } from './version_dataset';
import { registerGetDatasetVersionsRoute } from './get_dataset_versions';
import { registerGetDatasetStatsRoute } from './get_dataset_stats';
import { registerUpdateExampleSplitsRoute } from './update_example_splits';
import { registerImportExamplesRoute } from './import_examples';

const buildRouteSetup = ({
  registerRoute,
  method,
  path,
}: {
  registerRoute: (deps: RouteDependencies) => void;
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
}) => {
  const router = httpServiceMock.createRouter();
  const logger = loggingSystemMock.createLogger();
  const getEncryptedSavedObjectsStart = jest.fn().mockResolvedValue({
    getClient: jest.fn(),
    isEncryptionError: jest.fn(),
  });
  const getInternalRemoteConfigsSoClient = jest
    .fn()
    .mockResolvedValue(savedObjectsClientMock.create());
  registerRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    canEncrypt: true,
    getEncryptedSavedObjectsStart:
      getEncryptedSavedObjectsStart as unknown as RouteDependencies['getEncryptedSavedObjectsStart'],
    getInternalRemoteConfigsSoClient,
  });

  const versionedRouter = router.versioned as MockedVersionedRouter;
  const { handler } = versionedRouter.getRoute(method, path).versions[API_VERSIONS.internal.v1];

  const datasetClient = {
    list: jest.fn(),
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addExamples: jest.fn(),
    updateExample: jest.fn(),
    deleteExample: jest.fn(),
    upsert: jest.fn(),
    updateVersions: jest.fn(),
  };

  const datasetService = {
    getClient: jest.fn(),
  };

  const mockCoreContext = coreMock.createRequestHandlerContext();
  const esClient = mockCoreContext.elasticsearch.client.asCurrentUser;
  datasetService.getClient.mockReturnValue(datasetClient);
  const context = coreMock.createCustomRequestHandlerContext({
    core: mockCoreContext,
    evals: { datasetService } as any,
  });

  return { handler, context, logger, datasetClient, datasetService, esClient };
};

describe('dataset management routes', () => {
  const datasetId = 'dataset-1';
  const exampleId = 'example-1';
  const dataset = {
    id: datasetId,
    name: 'qa-dataset',
    description: 'Dataset description',
    versions: [],
    created_at: '2026-02-26T10:00:00.000Z',
    updated_at: '2026-02-26T11:00:00.000Z',
    examples: [
      {
        id: exampleId,
        dataset_id: datasetId,
        input: { question: 'What is Kibana?' },
        output: { answer: 'A UI for Elasticsearch' },
        metadata: { category: 'factual' },
        created_at: '2026-02-26T10:00:00.000Z',
        updated_at: '2026-02-26T11:00:00.000Z',
      },
    ],
  };

  describe('POST /internal/evals/datasets/{datasetId}/versions/tag', () => {
    it('creates a version tag for the dataset', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerVersionDatasetRoute,
        method: 'post',
        path: EVALS_DATASET_VERSION_TAG_URL,
      });
      datasetClient.get.mockResolvedValueOnce(dataset);
      datasetClient.updateVersions.mockResolvedValueOnce(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_VERSION_TAG_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: { tag: 'v1.0' },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.tag).toBe('v1.0');
      expect(response.payload.examples_count).toBe(1);
      expect(datasetClient.updateVersions).toHaveBeenCalledWith(
        datasetId,
        expect.arrayContaining([expect.objectContaining({ tag: 'v1.0' })])
      );
    });

    it('returns 404 when dataset does not exist', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerVersionDatasetRoute,
        method: 'post',
        path: EVALS_DATASET_VERSION_TAG_URL,
      });
      datasetClient.get.mockResolvedValueOnce(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_VERSION_TAG_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: { tag: 'v1.0' },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
    });

    it('returns 409 when tag already exists', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerVersionDatasetRoute,
        method: 'post',
        path: EVALS_DATASET_VERSION_TAG_URL,
      });
      datasetClient.get.mockResolvedValueOnce({
        ...dataset,
        versions: [{ tag: 'v1.0', created_at: '2026-02-26T10:00:00.000Z', examples_count: 1 }],
      });

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_VERSION_TAG_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: { tag: 'v1.0' },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(409);
    });
  });

  describe('GET /internal/evals/datasets/{datasetId}/versions', () => {
    it('returns version list', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerGetDatasetVersionsRoute,
        method: 'get',
        path: EVALS_DATASET_VERSIONS_URL,
      });
      const versions = [{ tag: 'v1.0', created_at: '2026-02-26T10:00:00.000Z', examples_count: 3 }];
      datasetClient.get.mockResolvedValueOnce({ ...dataset, versions });

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVALS_DATASET_VERSIONS_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.versions).toEqual(versions);
    });

    it('returns 404 when dataset does not exist', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerGetDatasetVersionsRoute,
        method: 'get',
        path: EVALS_DATASET_VERSIONS_URL,
      });
      datasetClient.get.mockResolvedValueOnce(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVALS_DATASET_VERSIONS_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /internal/evals/datasets/{datasetId}/stats', () => {
    it('returns dataset statistics', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerGetDatasetStatsRoute,
        method: 'get',
        path: EVALS_DATASET_STATS_URL,
      });
      datasetClient.get.mockResolvedValueOnce(dataset);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVALS_DATASET_STATS_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.total_examples).toBe(1);
      expect(response.payload.split_distribution).toEqual({ default: 1 });
      expect(response.payload.version_count).toBe(0);
      expect(response.payload.created_at).toBe(dataset.created_at);
      expect(response.payload.updated_at).toBe(dataset.updated_at);
    });

    it('returns 404 when dataset does not exist', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerGetDatasetStatsRoute,
        method: 'get',
        path: EVALS_DATASET_STATS_URL,
      });
      datasetClient.get.mockResolvedValueOnce(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVALS_DATASET_STATS_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /internal/evals/datasets/{datasetId}/examples/{exampleId}/splits', () => {
    it('updates example splits', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpdateExampleSplitsRoute,
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_SPLITS_URL,
      });
      datasetClient.get.mockResolvedValueOnce(dataset);
      datasetClient.updateExample.mockResolvedValueOnce({
        ...dataset.examples[0],
        metadata: { category: 'factual', splits: ['train', 'test'] },
      });

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_SPLITS_URL.replace('{datasetId}', datasetId).replace(
          '{exampleId}',
          exampleId
        ),
        params: { datasetId, exampleId },
        body: { splits: ['train', 'test'] },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.splits).toEqual(['train', 'test']);
      expect(datasetClient.updateExample).toHaveBeenCalledWith(exampleId, {
        metadata: { category: 'factual', splits: ['train', 'test'] },
      });
    });

    it('returns 404 when dataset does not exist', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpdateExampleSplitsRoute,
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_SPLITS_URL,
      });
      datasetClient.get.mockResolvedValueOnce(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_SPLITS_URL.replace('{datasetId}', datasetId).replace(
          '{exampleId}',
          exampleId
        ),
        params: { datasetId, exampleId },
        body: { splits: ['train'] },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
    });

    it('returns 404 when example does not exist in dataset', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpdateExampleSplitsRoute,
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_SPLITS_URL,
      });
      datasetClient.get.mockResolvedValueOnce({ ...dataset, examples: [] });

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_SPLITS_URL.replace('{datasetId}', datasetId).replace(
          '{exampleId}',
          exampleId
        ),
        params: { datasetId, exampleId },
        body: { splits: ['train'] },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /internal/evals/datasets/{datasetId}/import', () => {
    it('imports examples without schema validation', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerImportExamplesRoute,
        method: 'post',
        path: EVALS_DATASET_IMPORT_URL,
      });
      datasetClient.get.mockResolvedValueOnce(dataset);
      datasetClient.addExamples.mockResolvedValueOnce({ added: 2 });

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_IMPORT_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: {
          examples: [
            { input: { question: 'q1' }, output: { answer: 'a1' } },
            { input: { question: 'q2' }, output: { answer: 'a2' } },
          ],
        },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.added).toBe(2);
      expect(response.payload.rejected).toBe(0);
      expect(response.payload.errors).toEqual([]);
    });

    it('rejects examples with schema validation when keys mismatch', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerImportExamplesRoute,
        method: 'post',
        path: EVALS_DATASET_IMPORT_URL,
      });
      datasetClient.get.mockResolvedValueOnce(dataset);
      datasetClient.addExamples.mockResolvedValueOnce({ added: 1 });

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_IMPORT_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: {
          examples: [
            { input: { question: 'q1' }, output: { answer: 'a1' } },
            { input: { wrong_key: 'q2' }, output: { answer: 'a2' } },
          ],
          validate_schema: true,
        },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.added).toBe(1);
      expect(response.payload.rejected).toBe(1);
      expect(response.payload.errors).toHaveLength(1);
    });

    it('returns 404 when dataset does not exist', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerImportExamplesRoute,
        method: 'post',
        path: EVALS_DATASET_IMPORT_URL,
      });
      datasetClient.get.mockResolvedValueOnce(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_IMPORT_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: { examples: [] },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
    });
  });
});
