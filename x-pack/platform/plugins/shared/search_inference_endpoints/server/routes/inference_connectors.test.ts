/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { InferenceConnectorType } from '@kbn/inference-common';
import { MockRouter } from '../../__mocks__/router.mock';
import { ROUTE_VERSIONS } from '../../common/constants';
import { APIRoutes } from '../../common/types';
import { defineInferenceConnectorsRoute } from './inference_connectors';

const inferenceConnector = (connectorId: string) => ({
  type: InferenceConnectorType.Inference,
  name: connectorId,
  connectorId,
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
});

describe('GET /internal/search_inference_endpoints/connectors', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  let mockRouter: MockRouter;
  let context: jest.Mocked<RequestHandlerContext>;
  let getForFeature: jest.Mock;
  let getConnectorList: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    context = {} as jest.Mocked<RequestHandlerContext>;
    getForFeature = jest.fn();
    getConnectorList = jest.fn();
    mockRouter = new MockRouter({
      context,
      method: 'get',
      path: APIRoutes.GET_INFERENCE_CONNECTORS,
      version: ROUTE_VERSIONS.v1,
    });
    defineInferenceConnectorsRoute({
      logger: mockLogger,
      router: mockRouter.router,
      getForFeature,
      getConnectorList,
    });
  });

  it('returns SO endpoints when soEntryFound is true', async () => {
    const resolved = inferenceConnector('feature-ep');
    const fullCatalog = [resolved, inferenceConnector('other')];
    getForFeature.mockResolvedValue({
      endpoints: [resolved],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue(fullCatalog);

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(getForFeature).toHaveBeenCalledWith('my_feature', expect.anything());
    expect(getConnectorList).toHaveBeenCalledTimes(1);
    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [resolved],
        allConnectors: fullCatalog,
        soEntryFound: true,
      },
    });
  });

  it('returns recommended endpoints with soEntryFound false when no SO override', async () => {
    const recommended = inferenceConnector('rec-ep');
    const fullCatalog = [recommended, inferenceConnector('noise')];
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue(fullCatalog);

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [recommended],
        allConnectors: fullCatalog,
        soEntryFound: false,
      },
    });
  });

  it('returns empty connectors with soEntryFound false when no SO and no recommendations', async () => {
    const fullCatalog = [inferenceConnector('a'), inferenceConnector('b')];
    getForFeature.mockResolvedValue({
      endpoints: [],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue(fullCatalog);

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [],
        allConnectors: fullCatalog,
        soEntryFound: false,
      },
    });
  });

  it('returns empty connectors with soEntryFound true when SO explicitly lists empty', async () => {
    const fullCatalog = [inferenceConnector('a'), inferenceConnector('b')];
    getForFeature.mockResolvedValue({
      endpoints: [],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue(fullCatalog);

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [],
        allConnectors: fullCatalog,
        soEntryFound: true,
      },
    });
  });

  it('returns allConnectors when getForFeature fails', async () => {
    const fullCatalog = [inferenceConnector('a'), inferenceConnector('b')];
    getForFeature.mockRejectedValue(new Error('SO unavailable'));
    getConnectorList.mockResolvedValue(fullCatalog);

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [],
        allConnectors: fullCatalog,
        soEntryFound: false,
      },
    });
  });

  it('returns feature endpoints when getConnectorList fails', async () => {
    const resolved = inferenceConnector('feature-ep');
    getForFeature.mockResolvedValue({
      endpoints: [resolved],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockRejectedValue(new Error('Inference API unavailable'));

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [resolved],
        allConnectors: [],
        soEntryFound: true,
      },
    });
  });

  it('returns empty result when both getForFeature and getConnectorList fail', async () => {
    getForFeature.mockRejectedValue(new Error('SO unavailable'));
    getConnectorList.mockRejectedValue(new Error('Inference API unavailable'));

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [],
        allConnectors: [],
        soEntryFound: false,
      },
    });
  });
});
