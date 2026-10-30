/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InferenceConnectorType,
  InferenceTaskErrorCode,
  type InferenceConnector,
} from '@kbn/inference-common';
import { createChatModel } from './create_chat_model';
import { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';
import type { InferenceServerClient } from '../types';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';

jest.mock('./create_client');
import { createClient } from './create_client';
// `createChatModel` only calls the unbound overload of `createClient`
const createClientMock = createClient as unknown as jest.MockedFn<
  (options: Parameters<typeof createClient>[0]) => InferenceServerClient
>;

jest.mock('../util/get_connector_by_id');
import { getConnectorById } from '../util/get_connector_by_id';
const getConnectorByIdMock = getConnectorById as unknown as jest.MockedFn<typeof getConnectorById>;

jest.mock('@kbn/inference-langchain');
import { InferenceChatModel } from '@kbn/inference-langchain';
import { createRegexWorkerServiceMock } from '../test_utils';
const InferenceChatModelMock = InferenceChatModel as unknown as jest.Mock<
  typeof InferenceChatModel
>;

describe('createChatModel', () => {
  let logger: MockedLogger;
  let actions: ReturnType<typeof actionsMock.createStart>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let regexWorker: ReturnType<typeof createRegexWorkerServiceMock>;
  const mockEsClient = {
    ml: {
      inferTrainedModel: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    logger = loggerMock.create();
    actions = actionsMock.createStart();
    request = httpServerMock.createKibanaRequest();
    regexWorker = createRegexWorkerServiceMock();

    createClientMock.mockReturnValue({
      chatComplete: jest.fn(),
    } as any);
  });

  afterEach(() => {
    createClientMock.mockReset();
    getConnectorByIdMock.mockReset();
    InferenceChatModelMock.mockReset();
  });

  it('calls createClient with the right parameters', async () => {
    await createChatModel({
      request,
      connectorId: '.my-connector',
      actions,
      logger,
      chatModelOptions: {
        temperature: 0.3,
      },
      anonymizationRulesPromise: Promise.resolve([]),
      regexWorker,
      esClient: mockEsClient,
      endpointIdCache: new InferenceEndpointIdCache(),
    });

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith({
      actions,
      request,
      logger,
      esClient: mockEsClient,
      anonymizationRulesPromise: Promise.resolve([]),
      regexWorker,
      endpointIdCache: expect.any(InferenceEndpointIdCache),
    });
  });

  it('calls getConnectorById with the right parameters', async () => {
    await createChatModel({
      request,
      connectorId: '.my-connector',
      actions,
      logger,
      chatModelOptions: {
        temperature: 0.3,
      },
      anonymizationRulesPromise: Promise.resolve([]),
      regexWorker,
      esClient: mockEsClient,
      endpointIdCache: new InferenceEndpointIdCache(),
    });

    expect(getConnectorById).toHaveBeenCalledTimes(1);
    expect(getConnectorById).toHaveBeenCalledWith({
      connectorId: '.my-connector',
      actions,
      request,
      esClient: mockEsClient,
      logger,
    });
  });

  it('creates a InferenceChatModel with the right constructor params', async () => {
    const inferenceClient = {
      chatComplete: jest.fn(),
    } as any;
    createClientMock.mockReturnValue(inferenceClient);

    const connector = Symbol('connector') as any;
    getConnectorByIdMock.mockResolvedValue(connector);

    await createChatModel({
      request,
      connectorId: '.my-connector',
      actions,
      logger,
      chatModelOptions: {
        temperature: 0.3,
      },
      anonymizationRulesPromise: Promise.resolve([]),
      regexWorker,
      esClient: mockEsClient,
      endpointIdCache: new InferenceEndpointIdCache(),
    });

    expect(InferenceChatModelMock).toHaveBeenCalledTimes(1);
    expect(InferenceChatModelMock).toHaveBeenCalledWith({
      chatComplete: inferenceClient.chatComplete,
      connector,
      temperature: 0.3,
    });
  });

  describe('when built from a featureId', () => {
    const createFromFeature = ({
      resolveFeatureEndpoint,
      chatModelOptions = {},
    }: {
      resolveFeatureEndpoint?: jest.Mock;
      chatModelOptions?: Parameters<typeof createChatModel>[0]['chatModelOptions'];
    }) =>
      createChatModel({
        request,
        featureId: 'my_feature',
        resolveFeatureEndpoint,
        actions,
        logger,
        chatModelOptions,
        anonymizationRulesPromise: Promise.resolve([]),
        regexWorker,
        esClient: mockEsClient,
        endpointIdCache: new InferenceEndpointIdCache(),
      });

    it('resolves the feature endpoint and loads its connector when built from a featureId', async () => {
      const resolveFeatureEndpoint = jest.fn().mockResolvedValue({ connectorId: 'top-connector' });

      await createFromFeature({ resolveFeatureEndpoint });

      expect(resolveFeatureEndpoint).toHaveBeenCalledTimes(1);
      expect(resolveFeatureEndpoint).toHaveBeenCalledWith('my_feature');
      expect(getConnectorByIdMock).toHaveBeenCalledTimes(1);
      expect(getConnectorByIdMock).toHaveBeenCalledWith({
        connectorId: 'top-connector',
        actions,
        request,
        esClient: mockEsClient,
        logger,
      });
    });

    it('passes the feature endpoint resolver to the client so each call resolves the feature', async () => {
      const resolveFeatureEndpoint = jest.fn().mockResolvedValue({ connectorId: 'top-connector' });

      await createFromFeature({ resolveFeatureEndpoint });

      expect(createClientMock).toHaveBeenCalledTimes(1);
      expect(createClientMock).toHaveBeenCalledWith(
        expect.objectContaining({ resolveFeatureEndpoint })
      );
    });

    it('passes featureId to the InferenceChatModel and no reasoning from the feature', async () => {
      const inferenceClient: jest.Mocked<InferenceServerClient> = {
        chatComplete: jest.fn(),
        output: jest.fn(),
        prompt: jest.fn(),
        on: jest.fn(),
        bindTo: jest.fn(),
        listConnectors: jest.fn(),
        getConnectorById: jest.fn(),
      };
      createClientMock.mockReturnValue(inferenceClient);
      const connector: InferenceConnector = {
        type: InferenceConnectorType.OpenAI,
        name: 'Top connector',
        connectorId: 'c',
        config: {},
        capabilities: {},
        isInferenceEndpoint: false,
        isPreconfigured: false,
      };
      getConnectorByIdMock.mockResolvedValue(connector);
      const resolveFeatureEndpoint = jest.fn().mockResolvedValue({
        connectorId: 'c',
        reasoning: { effort: 'low' },
        temperature: 0.3,
      });

      await createFromFeature({ resolveFeatureEndpoint });

      expect(InferenceChatModelMock).toHaveBeenCalledTimes(1);
      const constructorParams = InferenceChatModelMock.mock.calls[0][0] as unknown as Record<
        string,
        unknown
      >;
      expect(constructorParams).toEqual({
        chatComplete: inferenceClient.chatComplete,
        connector,
        featureId: 'my_feature',
      });
      expect(constructorParams).not.toHaveProperty('reasoning');
      expect(constructorParams).not.toHaveProperty('temperature');
    });

    it('keeps the temperature given in chatModelOptions on the feature path', async () => {
      const resolveFeatureEndpoint = jest.fn().mockResolvedValue({
        connectorId: 'c',
        temperature: 0.3,
      });

      await createFromFeature({ resolveFeatureEndpoint, chatModelOptions: { temperature: 0.9 } });

      expect(InferenceChatModelMock).toHaveBeenCalledWith(
        expect.objectContaining({ featureId: 'my_feature', temperature: 0.9 })
      );
    });

    it('rejects with a request error when the feature has no endpoint', async () => {
      const resolveFeatureEndpoint = jest.fn().mockResolvedValue(undefined);

      await expect(createFromFeature({ resolveFeatureEndpoint })).rejects.toMatchObject({
        code: InferenceTaskErrorCode.requestError,
        status: 400,
        message: expect.stringContaining('No endpoint is available for feature "my_feature"'),
      });
      expect(getConnectorByIdMock).not.toHaveBeenCalled();
      expect(InferenceChatModelMock).not.toHaveBeenCalled();
    });

    it('rejects with an internal error when no resolver is registered', async () => {
      await expect(createFromFeature({})).rejects.toMatchObject({
        code: InferenceTaskErrorCode.internalError,
        message: expect.stringContaining('no feature endpoint resolver is registered'),
      });
      expect(getConnectorByIdMock).not.toHaveBeenCalled();
      expect(InferenceChatModelMock).not.toHaveBeenCalled();
    });
  });
});
