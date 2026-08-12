/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import { updateTransformWithAuth } from './update_transform_with_auth';

describe('updateTransformWithAuth', () => {
  const request = httpServerMock.createKibanaRequest({
    headers: {
      authorization: 'Bearer token',
    },
  });

  const createEsClient = () =>
    ({
      transform: {
        getTransform: jest.fn().mockResolvedValue({
          transforms: [
            {
              authorization: {
                api_key: {
                  id: 'legacy-api-key-id',
                },
              },
              source: {
                index: ['source-index'],
              },
            },
          ],
        }),
        updateTransform: jest.fn().mockResolvedValue({ acknowledged: true }),
      },
    } as any);

  const createRouteDependencies = ({
    scopedEsClient,
    uiamGrant,
  }: {
    scopedEsClient?: ReturnType<typeof createEsClient>;
    uiamGrant?: jest.Mock;
  } = {}) =>
    ({
      getCoreStart: jest.fn().mockResolvedValue({
        elasticsearch: {
          client: {
            asScoped: jest.fn().mockReturnValue({
              asCurrentUser: scopedEsClient,
            }),
          },
        },
        security: {
          authc: {
            apiKeys: {
              uiam: {
                grant: uiamGrant ?? jest.fn(),
              },
            },
          },
        },
      }),
      getSecurity: jest.fn().mockResolvedValue({
        authc: {
          apiKeys: {
            uiam: {
              grant: uiamGrant ?? jest.fn(),
            },
          },
        },
      }),
    } as any);

  it('uses the provided current-user client for non-routing updates', async () => {
    const esClient = createEsClient();
    const routeDependencies = createRouteDependencies();

    await updateTransformWithAuth({
      body: { description: 'updated' },
      esClient,
      request,
      routeDependencies,
      transformId: 'transform-id',
    });

    expect(esClient.transform.updateTransform).toHaveBeenCalledWith({
      body: { description: 'updated' },
      transform_id: 'transform-id',
    });
    expect(esClient.transform.getTransform).not.toHaveBeenCalled();
    expect(routeDependencies.getCoreStart).not.toHaveBeenCalled();
  });

  it('uses a granted UIAM API key for project-routing updates', async () => {
    const esClient = createEsClient();
    const scopedEsClient = createEsClient();
    const uiamGrant = jest.fn().mockResolvedValue({
      api_key: 'essu_uiam-key',
      id: 'uiam-key-id',
    });
    const routeDependencies = createRouteDependencies({ scopedEsClient, uiamGrant });

    await updateTransformWithAuth({
      body: { source: { project_routing: '_id:linked-id' } },
      esClient,
      request,
      routeDependencies,
      transformId: 'transform-id',
    });

    expect(routeDependencies.getCoreStart).toHaveBeenCalledTimes(1);
    const coreStart = await routeDependencies.getCoreStart.mock.results[0].value;
    expect(uiamGrant).toHaveBeenCalledWith(request, { name: 'auto-generated-transform-api-key' });
    expect(coreStart.elasticsearch.client.asScoped).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'ApiKey essu_uiam-key',
        }),
      })
    );
    expect(scopedEsClient.transform.updateTransform).toHaveBeenCalledWith({
      body: { source: { index: ['source-index'], project_routing: '_id:linked-id' } },
      transform_id: 'transform-id',
    });
    expect(esClient.transform.updateTransform).not.toHaveBeenCalled();
  });

  it('uses the provided current-user client when the transform already has UIAM auth', async () => {
    const esClient = createEsClient();
    esClient.transform.getTransform.mockResolvedValue({
      transforms: [
        {
          authorization: {
            cloud_api_key: {
              id: 'uiam-key-id',
            },
          },
          source: {
            index: ['source-index'],
          },
        },
      ],
    });
    const routeDependencies = createRouteDependencies();

    await updateTransformWithAuth({
      body: { source: { project_routing: '_id:linked-id' } },
      esClient,
      request,
      routeDependencies,
      transformId: 'transform-id',
    });

    expect(routeDependencies.getCoreStart).not.toHaveBeenCalled();
    expect(esClient.transform.updateTransform).toHaveBeenCalledWith({
      body: { source: { index: ['source-index'], project_routing: '_id:linked-id' } },
      transform_id: 'transform-id',
    });
  });

  it('falls back to the provided current-user client when UIAM grant fails', async () => {
    const esClient = createEsClient();
    const uiamGrant = jest.fn().mockRejectedValue(new Error('grant failed'));
    const routeDependencies = createRouteDependencies({ uiamGrant });

    await updateTransformWithAuth({
      body: { source: { project_routing: '_id:linked-id' } },
      esClient,
      request,
      routeDependencies,
      transformId: 'transform-id',
    });

    expect(esClient.transform.updateTransform).toHaveBeenCalledWith({
      body: { source: { index: ['source-index'], project_routing: '_id:linked-id' } },
      transform_id: 'transform-id',
    });
  });
});
