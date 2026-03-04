/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import {
  API_VERSIONS,
  EVALS_DATASETS_URL,
  EVALS_DATASET_URL,
  EVALS_DATASET_EXAMPLES_URL,
  EVALS_DATASET_EXAMPLE_URL,
  EVALS_DATASET_UPSERT_URL,
} from '@kbn/evals-common';
import { DatasetAlreadyExistsError } from '../../storage/dataset_already_exists_error';
import { ExampleAlreadyExistsError } from '../../storage/example_already_exists_error';
import { registerListDatasetsRoute } from './list_datasets';
import { registerCreateDatasetRoute } from './create_dataset';
import { registerGetDatasetRoute } from './get_dataset';
import { registerUpdateDatasetRoute } from './update_dataset';
import { registerDeleteDatasetRoute } from './delete_dataset';
import { registerAddExamplesRoute } from './add_examples';
import { registerUpdateExampleRoute } from './update_example';
import { registerDeleteExampleRoute } from './delete_example';
import { registerUpsertDatasetRoute } from './upsert_dataset';

const buildRouteSetup = ({
  registerRoute,
  method,
  path,
}: {
  registerRoute: (deps: {
    router: ReturnType<typeof httpServiceMock.createRouter>;
    logger: any;
  }) => void;
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
}) => {
  const router = httpServiceMock.createRouter();
  const logger = loggingSystemMock.createLogger();
  registerRoute({ router, logger });

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

describe('dataset routes', () => {
  const datasetId = 'dataset-1';
  const exampleId = 'example-1';
  const dataset = {
    id: datasetId,
    name: 'qa-dataset',
    description: 'Dataset description',
    created_at: '2026-02-26T10:00:00.000Z',
    updated_at: '2026-02-26T11:00:00.000Z',
  };
  const datasetExample = {
    id: exampleId,
    dataset_id: datasetId,
    input: { question: 'What is Kibana?' },
    output: { answer: 'A UI for Elasticsearch' },
    metadata: { category: 'factual' },
    created_at: '2026-02-26T10:00:00.000Z',
    updated_at: '2026-02-26T11:00:00.000Z',
  };

  describe('GET /internal/evals/datasets', () => {
    it('returns dataset listings with pagination', async () => {
      const { handler, context, datasetClient, datasetService, esClient } = buildRouteSetup({
        registerRoute: registerListDatasetsRoute,
        method: 'get',
        path: EVALS_DATASETS_URL,
      });
      datasetClient.list.mockResolvedValueOnce({
        datasets: [{ ...dataset, examples_count: 3 }],
        total: 1,
      });

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVALS_DATASETS_URL,
        query: { page: 2, per_page: 5 },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(datasetService.getClient).toHaveBeenCalledWith(esClient);
      expect(datasetClient.list).toHaveBeenCalledWith({ page: 2, perPage: 5 });
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        datasets: [{ ...dataset, examples_count: 3 }],
        total: 1,
      });
    });

    it('returns 500 when listing fails', async () => {
      const { handler, context, datasetClient, logger } = buildRouteSetup({
        registerRoute: registerListDatasetsRoute,
        method: 'get',
        path: EVALS_DATASETS_URL,
      });
      datasetClient.list.mockRejectedValueOnce(new Error('failed'));

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVALS_DATASETS_URL,
        query: { page: 1, per_page: 10 },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual({ message: 'Failed to list evaluation datasets' });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('POST /internal/evals/datasets', () => {
    it('creates a dataset and returns summary payload', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerCreateDatasetRoute,
        method: 'post',
        path: EVALS_DATASETS_URL,
      });
      datasetClient.create.mockResolvedValueOnce({ ...dataset, examples: [] });

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASETS_URL,
        body: {
          name: dataset.name,
          description: dataset.description,
        },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(datasetClient.create).toHaveBeenCalledWith(dataset.name, dataset.description);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        dataset_id: datasetId,
        name: dataset.name,
      });
    });

    it('returns 409 when dataset name already exists', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerCreateDatasetRoute,
        method: 'post',
        path: EVALS_DATASETS_URL,
      });
      datasetClient.create.mockRejectedValueOnce(new DatasetAlreadyExistsError(dataset.name));

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASETS_URL,
        body: { name: dataset.name, description: dataset.description },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(409);
      expect(response.payload).toEqual({
        message: `Dataset with name "${dataset.name}" already exists`,
      });
    });

    it('returns 500 when create fails', async () => {
      const { handler, context, datasetClient, logger } = buildRouteSetup({
        registerRoute: registerCreateDatasetRoute,
        method: 'post',
        path: EVALS_DATASETS_URL,
      });
      datasetClient.create.mockRejectedValueOnce(new Error('boom'));

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASETS_URL,
        body: { name: dataset.name, description: dataset.description },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual({ message: 'Failed to create evaluation dataset' });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('GET /internal/evals/datasets/{datasetId}', () => {
    it('returns dataset with examples', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerGetDatasetRoute,
        method: 'get',
        path: EVALS_DATASET_URL,
      });
      datasetClient.get.mockResolvedValueOnce({ ...dataset, examples: [datasetExample] });

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVALS_DATASET_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ ...dataset, examples: [datasetExample] });
    });

    it('returns 404 for unknown dataset id', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerGetDatasetRoute,
        method: 'get',
        path: EVALS_DATASET_URL,
      });
      datasetClient.get.mockResolvedValueOnce(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVALS_DATASET_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
      expect(response.payload).toEqual({ message: `Evaluation dataset not found: ${datasetId}` });
    });

    it('returns 500 when get fails', async () => {
      const { handler, context, datasetClient, logger } = buildRouteSetup({
        registerRoute: registerGetDatasetRoute,
        method: 'get',
        path: EVALS_DATASET_URL,
      });
      datasetClient.get.mockRejectedValueOnce(new Error('failed'));

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVALS_DATASET_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual({ message: 'Failed to get evaluation dataset' });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('PUT /internal/evals/datasets/{datasetId}', () => {
    it('updates dataset description', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpdateDatasetRoute,
        method: 'put',
        path: EVALS_DATASET_URL,
      });
      datasetClient.update.mockResolvedValueOnce(dataset);

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: EVALS_DATASET_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: { description: dataset.description },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(datasetClient.update).toHaveBeenCalledWith(datasetId, {
        description: dataset.description,
      });
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        created_at: dataset.created_at,
        updated_at: dataset.updated_at,
      });
    });

    it('returns 404 when dataset update target does not exist', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpdateDatasetRoute,
        method: 'put',
        path: EVALS_DATASET_URL,
      });
      datasetClient.update.mockResolvedValueOnce(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: EVALS_DATASET_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: { description: 'updated' },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
      expect(response.payload).toEqual({ message: `Evaluation dataset not found: ${datasetId}` });
    });

    it('returns 500 when update fails', async () => {
      const { handler, context, datasetClient, logger } = buildRouteSetup({
        registerRoute: registerUpdateDatasetRoute,
        method: 'put',
        path: EVALS_DATASET_URL,
      });
      datasetClient.update.mockRejectedValueOnce(new Error('failed'));

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: EVALS_DATASET_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: { description: 'updated' },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual({ message: 'Failed to update evaluation dataset' });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('DELETE /internal/evals/datasets/{datasetId}', () => {
    it('deletes an existing dataset', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerDeleteDatasetRoute,
        method: 'delete',
        path: EVALS_DATASET_URL,
      });
      datasetClient.delete.mockResolvedValueOnce(true);

      const request = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: EVALS_DATASET_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ success: true });
    });

    it('returns 404 when dataset does not exist', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerDeleteDatasetRoute,
        method: 'delete',
        path: EVALS_DATASET_URL,
      });
      datasetClient.delete.mockResolvedValueOnce(false);

      const request = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: EVALS_DATASET_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
      expect(response.payload).toEqual({ message: `Evaluation dataset not found: ${datasetId}` });
    });

    it('returns 500 when delete fails', async () => {
      const { handler, context, datasetClient, logger } = buildRouteSetup({
        registerRoute: registerDeleteDatasetRoute,
        method: 'delete',
        path: EVALS_DATASET_URL,
      });
      datasetClient.delete.mockRejectedValueOnce(new Error('failed'));

      const request = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: EVALS_DATASET_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual({ message: 'Failed to delete evaluation dataset' });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('POST /internal/evals/datasets/{datasetId}/examples', () => {
    it('adds examples for an existing dataset', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerAddExamplesRoute,
        method: 'post',
        path: EVALS_DATASET_EXAMPLES_URL,
      });
      datasetClient.get.mockResolvedValueOnce({ ...dataset, examples: [datasetExample] });
      datasetClient.addExamples.mockResolvedValueOnce({ added: 2 });

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_EXAMPLES_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: {
          examples: [
            { input: { question: 'q1' }, output: { answer: 'a1' }, metadata: {} },
            { input: { question: 'q2' }, output: { answer: 'a2' }, metadata: { type: 'new' } },
          ],
        },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(datasetClient.addExamples).toHaveBeenCalledWith(datasetId, [
        { input: { question: 'q1' }, output: { answer: 'a1' }, metadata: {} },
        { input: { question: 'q2' }, output: { answer: 'a2' }, metadata: { type: 'new' } },
      ]);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ added: 2 });
    });

    it('adds examples with only input (no output or metadata)', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerAddExamplesRoute,
        method: 'post',
        path: EVALS_DATASET_EXAMPLES_URL,
      });
      datasetClient.get.mockResolvedValueOnce({ ...dataset, examples: [] });
      datasetClient.addExamples.mockResolvedValueOnce({ added: 1 });

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_EXAMPLES_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: {
          examples: [{ input: { question: 'input-only' } }],
        },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(datasetClient.addExamples).toHaveBeenCalledWith(datasetId, [
        { input: { question: 'input-only' } },
      ]);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ added: 1 });
    });

    it('adds a completely empty example (no input, output, or metadata)', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerAddExamplesRoute,
        method: 'post',
        path: EVALS_DATASET_EXAMPLES_URL,
      });
      datasetClient.get.mockResolvedValueOnce({ ...dataset, examples: [] });
      datasetClient.addExamples.mockResolvedValueOnce({ added: 1 });

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_EXAMPLES_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: {
          examples: [{}],
        },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(datasetClient.addExamples).toHaveBeenCalledWith(datasetId, [{}]);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ added: 1 });
    });

    it('returns 404 when dataset does not exist', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerAddExamplesRoute,
        method: 'post',
        path: EVALS_DATASET_EXAMPLES_URL,
      });
      datasetClient.get.mockResolvedValueOnce(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_EXAMPLES_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: { examples: [] },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
      expect(response.payload).toEqual({ message: `Evaluation dataset not found: ${datasetId}` });
      expect(datasetClient.addExamples).not.toHaveBeenCalled();
    });

    it('returns 409 when adding a duplicate example', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerAddExamplesRoute,
        method: 'post',
        path: EVALS_DATASET_EXAMPLES_URL,
      });
      datasetClient.get.mockResolvedValueOnce({ ...dataset, examples: [datasetExample] });
      datasetClient.addExamples.mockRejectedValueOnce(new ExampleAlreadyExistsError('1 duplicate'));

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_EXAMPLES_URL.replace('{datasetId}', datasetId),
        params: { datasetId },
        body: {
          examples: [{ input: datasetExample.input, output: datasetExample.output, metadata: {} }],
        },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(409);
      expect(response.payload.message).toContain('already exists');
    });
  });

  describe('PUT /internal/evals/datasets/{datasetId}/examples/{exampleId}', () => {
    it('updates one example in the dataset', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpdateExampleRoute,
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_URL,
      });
      datasetClient.get.mockResolvedValueOnce({ ...dataset, examples: [datasetExample] });
      datasetClient.updateExample.mockResolvedValueOnce({
        ...datasetExample,
        output: { answer: 'updated' },
      });

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_URL.replace('{datasetId}', datasetId).replace(
          '{exampleId}',
          exampleId
        ),
        params: { datasetId, exampleId },
        body: { output: { answer: 'updated' } },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(datasetClient.updateExample).toHaveBeenCalledWith(exampleId, {
        input: undefined,
        output: { answer: 'updated' },
        metadata: undefined,
      });
      expect(response.status).toBe(200);
      expect(response.payload.output).toEqual({ answer: 'updated' });
    });

    it('returns 404 when dataset does not exist', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpdateExampleRoute,
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_URL,
      });
      datasetClient.get.mockResolvedValueOnce(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_URL.replace('{datasetId}', datasetId).replace(
          '{exampleId}',
          exampleId
        ),
        params: { datasetId, exampleId },
        body: { input: {} },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
      expect(response.payload).toEqual({ message: `Evaluation dataset not found: ${datasetId}` });
    });

    it('returns 404 when example is not in dataset', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpdateExampleRoute,
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_URL,
      });
      datasetClient.get.mockResolvedValueOnce({ ...dataset, examples: [] });

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_URL.replace('{datasetId}', datasetId).replace(
          '{exampleId}',
          exampleId
        ),
        params: { datasetId, exampleId },
        body: { input: {} },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
      expect(response.payload).toEqual({
        message: `Evaluation dataset example not found: ${exampleId}`,
      });
      expect(datasetClient.updateExample).not.toHaveBeenCalled();
    });

    it('returns 409 when updated content matches another existing example', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpdateExampleRoute,
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_URL,
      });
      datasetClient.get.mockResolvedValueOnce({ ...dataset, examples: [datasetExample] });
      datasetClient.updateExample.mockRejectedValueOnce(
        new ExampleAlreadyExistsError('collision-id')
      );

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: EVALS_DATASET_EXAMPLE_URL.replace('{datasetId}', datasetId).replace(
          '{exampleId}',
          exampleId
        ),
        params: { datasetId, exampleId },
        body: { input: { question: 'duplicate content' } },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(409);
      expect(response.payload.message).toContain('already exists');
    });
  });

  describe('DELETE /internal/evals/datasets/{datasetId}/examples/{exampleId}', () => {
    it('deletes one example from the dataset', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerDeleteExampleRoute,
        method: 'delete',
        path: EVALS_DATASET_EXAMPLE_URL,
      });
      datasetClient.get.mockResolvedValueOnce({ ...dataset, examples: [datasetExample] });
      datasetClient.deleteExample.mockResolvedValueOnce(true);

      const request = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: EVALS_DATASET_EXAMPLE_URL.replace('{datasetId}', datasetId).replace(
          '{exampleId}',
          exampleId
        ),
        params: { datasetId, exampleId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ success: true });
    });

    it('returns 404 when dataset does not exist', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerDeleteExampleRoute,
        method: 'delete',
        path: EVALS_DATASET_EXAMPLE_URL,
      });
      datasetClient.get.mockResolvedValueOnce(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: EVALS_DATASET_EXAMPLE_URL.replace('{datasetId}', datasetId).replace(
          '{exampleId}',
          exampleId
        ),
        params: { datasetId, exampleId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
      expect(response.payload).toEqual({ message: `Evaluation dataset not found: ${datasetId}` });
    });

    it('returns 404 when example is not in dataset', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerDeleteExampleRoute,
        method: 'delete',
        path: EVALS_DATASET_EXAMPLE_URL,
      });
      datasetClient.get.mockResolvedValueOnce({ ...dataset, examples: [] });

      const request = httpServerMock.createKibanaRequest({
        method: 'delete',
        path: EVALS_DATASET_EXAMPLE_URL.replace('{datasetId}', datasetId).replace(
          '{exampleId}',
          exampleId
        ),
        params: { datasetId, exampleId },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
      expect(response.payload).toEqual({
        message: `Evaluation dataset example not found: ${exampleId}`,
      });
      expect(datasetClient.deleteExample).not.toHaveBeenCalled();
    });
  });

  describe('POST /internal/evals/datasets/_upsert', () => {
    it('returns the upsert diff response', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpsertDatasetRoute,
        method: 'post',
        path: EVALS_DATASET_UPSERT_URL,
      });
      datasetClient.upsert.mockResolvedValueOnce({
        dataset_id: datasetId,
        added: 1,
        removed: 0,
        unchanged: 2,
      });

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_UPSERT_URL,
        body: {
          name: dataset.name,
          description: dataset.description,
          examples: [{ input: datasetExample.input, output: datasetExample.output, metadata: {} }],
        },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(datasetClient.upsert).toHaveBeenCalledWith(dataset.name, dataset.description, [
        { input: datasetExample.input, output: datasetExample.output, metadata: {} },
      ]);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        dataset_id: datasetId,
        added: 1,
        removed: 0,
        unchanged: 2,
      });
    });

    it('upserts examples with only input (no output or metadata)', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpsertDatasetRoute,
        method: 'post',
        path: EVALS_DATASET_UPSERT_URL,
      });
      datasetClient.upsert.mockResolvedValueOnce({
        dataset_id: datasetId,
        added: 2,
        removed: 0,
        unchanged: 0,
      });

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_UPSERT_URL,
        body: {
          name: dataset.name,
          description: dataset.description,
          examples: [
            { input: { searchTerm: 'query 1' } },
            { input: { searchTerm: 'query 2' }, metadata: { minDocs: 1 } },
          ],
        },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(datasetClient.upsert).toHaveBeenCalledWith(dataset.name, dataset.description, [
        { input: { searchTerm: 'query 1' } },
        { input: { searchTerm: 'query 2' }, metadata: { minDocs: 1 } },
      ]);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        dataset_id: datasetId,
        added: 2,
        removed: 0,
        unchanged: 0,
      });
    });

    it('upserts a completely empty example', async () => {
      const { handler, context, datasetClient } = buildRouteSetup({
        registerRoute: registerUpsertDatasetRoute,
        method: 'post',
        path: EVALS_DATASET_UPSERT_URL,
      });
      datasetClient.upsert.mockResolvedValueOnce({
        dataset_id: datasetId,
        added: 1,
        removed: 0,
        unchanged: 0,
      });

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_UPSERT_URL,
        body: {
          name: dataset.name,
          description: dataset.description,
          examples: [{}],
        },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(datasetClient.upsert).toHaveBeenCalledWith(dataset.name, dataset.description, [{}]);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        dataset_id: datasetId,
        added: 1,
        removed: 0,
        unchanged: 0,
      });
    });

    it('returns 500 when upsert fails', async () => {
      const { handler, context, datasetClient, logger } = buildRouteSetup({
        registerRoute: registerUpsertDatasetRoute,
        method: 'post',
        path: EVALS_DATASET_UPSERT_URL,
      });
      datasetClient.upsert.mockRejectedValueOnce(new Error('failed'));

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_DATASET_UPSERT_URL,
        body: { name: dataset.name, description: dataset.description, examples: [] },
      });

      const response = await handler(context as any, request, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual({ message: 'Failed to upsert evaluation dataset' });
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
