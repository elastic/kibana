/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import { InferenceConnectorType } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
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

interface SettingsValues {
  defaultConnectorId?: string;
  defaultConnectorOnly?: boolean;
}

const createContext = ({
  defaultConnectorId,
  defaultConnectorOnly,
}: SettingsValues = {}): jest.Mocked<RequestHandlerContext> =>
  ({
    core: Promise.resolve({
      uiSettings: {
        client: {
          get: jest.fn(async (key: string) => {
            if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return defaultConnectorId;
            if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY)
              return defaultConnectorOnly ?? false;
            return undefined;
          }),
        },
      },
    }),
  } as unknown as jest.Mocked<RequestHandlerContext>);

describe('GET /internal/search_inference_endpoints/connectors', () => {
  const mockLogger = loggingSystemMock.createLogger().get();
  let mockRouter: MockRouter;
  let getForFeature: jest.Mock;
  let getConnectorList: jest.Mock;
  let getConnectorById: jest.Mock;

  const registerRoute = (settings: SettingsValues = {}) => {
    mockRouter = new MockRouter({
      context: createContext(settings),
      method: 'get',
      path: APIRoutes.GET_INFERENCE_CONNECTORS,
      version: ROUTE_VERSIONS.v1,
    });
    defineInferenceConnectorsRoute({
      logger: mockLogger,
      router: mockRouter.router,
      getForFeature,
      getConnectorList,
      getConnectorById,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getForFeature = jest.fn();
    getConnectorList = jest.fn();
    getConnectorById = jest.fn();
  });

  it('returns SO-configured endpoints as-is when soEntryFound is true', async () => {
    const resolved = inferenceConnector('feature-ep');
    getForFeature.mockResolvedValue({
      endpoints: [resolved],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue([resolved, inferenceConnector('other')]);
    registerRoute();

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(getForFeature).toHaveBeenCalledWith('my_feature', expect.anything());
    expect(getConnectorList).toHaveBeenCalledTimes(1);
    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [resolved],
        soEntryFound: true,
      },
    });
  });

  it('marks recommended endpoints with isRecommended and appends the rest of the catalog', async () => {
    const recommended = inferenceConnector('rec-ep');
    const other = inferenceConnector('noise');
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([recommended, other]);
    registerRoute();

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [{ ...recommended, isRecommended: true }, other],
        soEntryFound: false,
      },
    });
  });

  it('returns the catalog alone when there are no recommendations or SO override', async () => {
    const a = inferenceConnector('a');
    const b = inferenceConnector('b');
    getForFeature.mockResolvedValue({
      endpoints: [],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([a, b]);
    registerRoute();

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [a, b],
        soEntryFound: false,
      },
    });
  });

  it('returns an empty list when SO explicitly configures no endpoints', async () => {
    getForFeature.mockResolvedValue({
      endpoints: [],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue([inferenceConnector('a')]);
    registerRoute();

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [],
        soEntryFound: true,
      },
    });
  });

  it('returns only the default connector when defaultConnectorOnly is set', async () => {
    const defaultConnector = inferenceConnector('default-id');
    getConnectorById.mockResolvedValue(defaultConnector);
    registerRoute({ defaultConnectorId: 'default-id', defaultConnectorOnly: true });

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(getConnectorById).toHaveBeenCalledWith('default-id', expect.anything());
    expect(getForFeature).not.toHaveBeenCalled();
    expect(getConnectorList).not.toHaveBeenCalled();
    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [defaultConnector],
        soEntryFound: false,
      },
    });
  });

  it('returns an empty list when defaultConnectorOnly is set but no default is configured', async () => {
    registerRoute({ defaultConnectorOnly: true });

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(getConnectorById).not.toHaveBeenCalled();
    expect(getForFeature).not.toHaveBeenCalled();
    expect(getConnectorList).not.toHaveBeenCalled();
    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [],
        soEntryFound: false,
      },
    });
  });

  it('returns an empty list when defaultConnectorOnly is set but the default connector lookup fails', async () => {
    getConnectorById.mockRejectedValue(new Error('Connector not found'));
    registerRoute({ defaultConnectorId: 'missing', defaultConnectorOnly: true });

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [],
        soEntryFound: false,
      },
    });
  });

  it('prepends the default connector when soEntryFound is false and a default is configured', async () => {
    const recommended = inferenceConnector('rec');
    const other = inferenceConnector('other');
    const defaultConnector = inferenceConnector('default');
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([recommended, other]);
    getConnectorById.mockResolvedValue(defaultConnector);
    registerRoute({ defaultConnectorId: 'default' });

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(getConnectorById).toHaveBeenCalledWith('default', expect.anything());
    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [defaultConnector, { ...recommended, isRecommended: true }, other],
        soEntryFound: false,
      },
    });
  });

  it('replaces an existing entry when the default connector is already in the merged list', async () => {
    const recommended = inferenceConnector('rec');
    const defaultInCatalog = inferenceConnector('default');
    const fullCatalog = [recommended, defaultInCatalog];
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue(fullCatalog);
    getConnectorById.mockResolvedValue(defaultInCatalog);
    registerRoute({ defaultConnectorId: 'default' });

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [defaultInCatalog, { ...recommended, isRecommended: true }],
        soEntryFound: false,
      },
    });
  });

  it('ignores the default connector when soEntryFound is true', async () => {
    const resolved = inferenceConnector('feature-ep');
    getForFeature.mockResolvedValue({
      endpoints: [resolved],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue([resolved]);
    registerRoute({ defaultConnectorId: 'default' });

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(getConnectorById).not.toHaveBeenCalled();
    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [resolved],
        soEntryFound: true,
      },
    });
  });

  it('returns the merged list without the default connector when its lookup fails', async () => {
    const recommended = inferenceConnector('rec');
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([recommended]);
    getConnectorById.mockRejectedValue(new Error('Default connector unavailable'));
    registerRoute({ defaultConnectorId: 'default' });

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [{ ...recommended, isRecommended: true }],
        soEntryFound: false,
      },
    });
  });

  it('falls back to the catalog when getForFeature fails', async () => {
    const a = inferenceConnector('a');
    const b = inferenceConnector('b');
    getForFeature.mockRejectedValue(new Error('SO unavailable'));
    getConnectorList.mockResolvedValue([a, b]);
    registerRoute();

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [a, b],
        soEntryFound: false,
      },
    });
  });

  it('falls back to the feature endpoints when getConnectorList fails', async () => {
    const resolved = inferenceConnector('feature-ep');
    getForFeature.mockResolvedValue({
      endpoints: [resolved],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockRejectedValue(new Error('Inference API unavailable'));
    registerRoute();

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [resolved],
        soEntryFound: true,
      },
    });
  });

  it('returns an empty result when both getForFeature and getConnectorList fail', async () => {
    getForFeature.mockRejectedValue(new Error('SO unavailable'));
    getConnectorList.mockRejectedValue(new Error('Inference API unavailable'));
    registerRoute();

    await mockRouter.callRoute({ query: { featureId: 'my_feature' } });

    expect(mockRouter.response.ok).toHaveBeenCalledWith({
      body: {
        connectors: [],
        soEntryFound: false,
      },
    });
  });
});
