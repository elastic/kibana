/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { FieldType, type InferenceEndpointRequestBody } from '@kbn/inference-common';
import { getInferenceServicesRoute } from '.';

const services = [
  {
    service: 'openai',
    name: 'OpenAI',
    task_types: ['text_embedding'],
    configurations: {
      model_id: {
        default_value: null,
        description: null,
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: false,
        type: FieldType.STRING,
        supported_task_types: ['text_embedding'],
      },
      scopes: {
        default_value: null,
        description: null,
        label: 'Scopes',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.LIST,
        supported_task_types: ['text_embedding'],
      },
      client_secret: {
        default_value: null,
        description: null,
        label: 'Client secret',
        required: false,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['text_embedding'],
      },
      api_key: {
        default_value: null,
        description: null,
        label: 'API key',
        required: false,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['text_embedding'],
      },
    },
  },
];

const updateRequestBody = (provider: string, scopes: string[]): InferenceEndpointRequestBody => ({
  config: {
    inferenceId: 'openai-embeddings',
    provider,
    taskType: 'text_embedding',
    providerConfig: { model_id: 'text-embedding-3-small', scopes },
  },
  secrets: {
    providerSecrets: { api_key: null, client_secret: 'secret' },
  },
});

describe('PUT /internal/_inference/_update', () => {
  const setup = (provider: string, scopes: string[] = ['api']) => {
    const router = httpServiceMock.createRouter();
    getInferenceServicesRoute(router, loggingSystemMock.createLogger());
    const handler = router.versioned.getRoute('put', '/internal/_inference/_update').versions['1']
      ?.handler;
    if (!handler) {
      throw new Error('Update route was not registered');
    }

    const esClient = elasticsearchServiceMock.createScopedClusterClient();
    esClient.asInternalUser.transport.request.mockResolvedValue(services);
    esClient.asCurrentUser.transport.request.mockResolvedValue({});
    const context = {
      core: Promise.resolve({ elasticsearch: { client: esClient } }),
    } as unknown as RequestHandlerContext;
    const request = httpServerMock.createKibanaRequest({
      method: 'put',
      body: updateRequestBody(provider, scopes),
    });
    const response = httpServerMock.createResponseFactory();

    return { handler, esClient, context, request, response };
  };

  it('sends the updatable fields that have a value', async () => {
    const { handler, esClient, context, request, response } = setup('openai');

    await handler(context, request, response);

    expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledWith(
      {
        method: 'PUT',
        path: '/_inference/text_embedding/openai-embeddings/_update',
        body: JSON.stringify({
          service_settings: { scopes: ['api'], client_secret: 'secret' },
        }),
      },
      { headers: { 'content-type': 'application/json' } }
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('sends a cleared list so the stored list is cleared', async () => {
    const { handler, esClient, context, request, response } = setup('openai', []);

    await handler(context, request, response);

    expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledWith(
      {
        method: 'PUT',
        path: '/_inference/text_embedding/openai-embeddings/_update',
        body: JSON.stringify({
          service_settings: { scopes: [], client_secret: 'secret' },
        }),
      },
      { headers: { 'content-type': 'application/json' } }
    );
  });

  it('returns a bad request without updating when the service configuration is missing', async () => {
    const { handler, esClient, context, request, response } = setup('unknown');

    await handler(context, request, response);

    expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'Unable to find the configuration for service unknown' },
    });
  });
});
