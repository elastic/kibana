/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createChatModel } from './create_chat_model';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';

jest.mock('./create_client');
import { createClient } from './create_client';
const createClientMock = createClient as unknown as jest.MockedFn<typeof createClient>;

jest.mock('../util/get_connector_by_id');
import { getConnectorById } from '../util/get_connector_by_id';
const getConnectorByIdMock = getConnectorById as unknown as jest.MockedFn<typeof getConnectorById>;

jest.mock('@kbn/inference-langchain');
import { InferenceChatModel } from '@kbn/inference-langchain';
const InferenceChatModelMock = InferenceChatModel as unknown as jest.Mock<
  typeof InferenceChatModel
>;

describe('createChatModel', () => {
  let logger: MockedLogger;
  let actions: ReturnType<typeof actionsMock.createStart>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

  beforeEach(() => {
    logger = loggerMock.create();
    actions = actionsMock.createStart();
    request = httpServerMock.createKibanaRequest();

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
    });

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith({
      actions,
      request,
      logger,
    });
  });

  it('calls getConnectorById with the right parameters', async () => {
    const actionsClient = Symbol('actionsClient') as any;
    actions.getActionsClientWithRequest.mockResolvedValue(actionsClient);

    await createChatModel({
      request,
      connectorId: '.my-connector',
      actions,
      logger,
      chatModelOptions: {
        temperature: 0.3,
      },
    });

    expect(getConnectorById).toHaveBeenCalledTimes(1);
    expect(getConnectorById).toHaveBeenCalledWith({
      connectorId: '.my-connector',
      actionsClient,
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
    });

    expect(InferenceChatModelMock).toHaveBeenCalledTimes(1);
    expect(InferenceChatModelMock).toHaveBeenCalledWith({
      chatComplete: inferenceClient.chatComplete,
      connector,
      logger,
      temperature: 0.3,
    });
  });
});
