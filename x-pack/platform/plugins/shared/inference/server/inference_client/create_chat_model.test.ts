/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { createChatModel } from './create_chat_model';
import { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';

vi.mock('./create_client');
import { createClient } from './create_client';
const createClientMock = createClient as unknown as MockedFunction<typeof createClient>;

vi.mock('../util/get_connector_by_id');
import { getConnectorById } from '../util/get_connector_by_id';
const getConnectorByIdMock = getConnectorById as unknown as MockedFunction<typeof getConnectorById>;

vi.mock('@kbn/inference-langchain');
import { InferenceChatModel } from '@kbn/inference-langchain';
import { createRegexWorkerServiceMock } from '../test_utils';
const InferenceChatModelMock = InferenceChatModel as unknown as Mock<typeof InferenceChatModel>;

describe('createChatModel', () => {
  let logger: MockedLogger;
  let actions: ReturnType<typeof actionsMock.createStart>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let regexWorker: ReturnType<typeof createRegexWorkerServiceMock>;
  const mockEsClient = {
    ml: {
      inferTrainedModel: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    logger = loggerMock.create();
    actions = actionsMock.createStart();
    request = httpServerMock.createKibanaRequest();
    regexWorker = createRegexWorkerServiceMock();

    createClientMock.mockReturnValue({
      chatComplete: vi.fn(),
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
      chatComplete: vi.fn(),
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
});
