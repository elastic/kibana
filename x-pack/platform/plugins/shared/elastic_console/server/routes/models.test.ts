/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { type InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { isElasticConsoleEnabled } from './is_enabled';
import { registerModelsRoute } from './models';

jest.mock('./is_enabled', () => ({
  isElasticConsoleEnabled: jest.fn(),
}));

const isElasticConsoleEnabledMock = isElasticConsoleEnabled as jest.MockedFunction<
  typeof isElasticConsoleEnabled
>;

const createConnector = (parts: Partial<InferenceConnector> = {}): InferenceConnector => ({
  connectorId: 'connector-1',
  name: 'Connector 1',
  type: InferenceConnectorType.OpenAI,
  config: {},
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
  ...parts,
});

describe('registerModelsRoute', () => {
  let coreSetup: jest.Mocked<
    Pick<CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>, 'getStartServices'>
  >;
  let inference: ReturnType<typeof inferenceMock.createStartContract>;
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    inference = inferenceMock.createStartContract();
    router = httpServiceMock.createRouter();
    coreSetup = {
      getStartServices: jest.fn().mockResolvedValue([{}, { inference }]),
    };
    isElasticConsoleEnabledMock.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the OpenAI-compatible models route', () => {
    registerModelsRoute({
      router,
      coreSetup: coreSetup as unknown as CoreSetup<
        ElasticConsoleStartDependencies,
        ElasticConsolePluginStart
      >,
      logger,
    });

    const [config] = router.get.mock.calls[0];
    expect(config.path).toBe('/internal/elastic_ramen/v1/models');
    expect(config.options?.access).toBe('internal');
  });

  it('returns connector context window sizes when available', async () => {
    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();
    inference.getConnectorList.mockResolvedValue([
      createConnector({
        connectorId: 'sonnet-4',
        type: InferenceConnectorType.Bedrock,
        capabilities: { contextWindowSize: 1000000 },
      }),
      createConnector({ connectorId: 'unknown-model' }),
    ]);

    registerModelsRoute({
      router,
      coreSetup: coreSetup as unknown as CoreSetup<
        ElasticConsoleStartDependencies,
        ElasticConsolePluginStart
      >,
      logger,
    });

    const [, handler] = router.get.mock.calls[0];
    await handler({}, request, response);

    expect(inference.getConnectorList).toHaveBeenCalledWith(request);
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        object: 'list',
        data: [
          {
            id: 'sonnet-4',
            object: 'model',
            created: 1700000000,
            owned_by: InferenceConnectorType.Bedrock,
            permission: [],
            root: 'sonnet-4',
            parent: null,
            context_window_size: 1000000,
          },
          {
            id: 'unknown-model',
            object: 'model',
            created: 1700000000,
            owned_by: InferenceConnectorType.OpenAI,
            permission: [],
            root: 'unknown-model',
            parent: null,
            context_window_size: undefined,
          },
        ],
      },
    });

    const body = response.ok.mock.calls[0][0]?.body as Record<string, unknown>;
    const serializedBody = JSON.parse(JSON.stringify(body));
    expect(serializedBody.data[0].context_window_size).toBe(1000000);
    expect(serializedBody.data[1]).not.toHaveProperty('context_window_size');
  });
});
