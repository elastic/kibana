/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import { FakeLLM } from '@langchain/core/utils/testing';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';

export const createMockClients = () => {
  const core = coreMock.createRequestHandlerContext();

  return {
    core,
    clusterClient: core.elasticsearch.client,
    savedObjectsClient: core.savedObjects.client,
  };
};

type MockClients = ReturnType<typeof createMockClients>;

const convertRequestContextMock = <T extends Record<string, unknown>>(context: T) => {
  return coreMock.createCustomRequestHandlerContext(context);
};

const mockLlm = new FakeLLM({
  response: JSON.stringify({}, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

jest.mock('@kbn/langchain/server/language_models', () => {
  return {
    ActionsClientSimpleChatModel: jest.fn().mockImplementation(() => {
      return mockLlm;
    }),
    ActionsClientChatOpenAI: jest.fn().mockImplementation(() => {
      return mockLlm;
    }),
  };
});

const actions = {
  getActionsClientWithRequest: jest.fn().mockResolvedValue({
    get: jest.fn().mockResolvedValue({
      mockLlm,
    }),
    execute: jest.fn().mockResolvedValue({
      status: 'ok',
      data: {
        message: '{"Answer": "testAction"}',
      },
    }),
  }),
} as unknown as ActionsPluginStart;

const coreSetupMock = coreMock.createSetup();
const createRequestContextMock = (clients: MockClients = createMockClients()) => {
  return {
    automaticImport: {
      getStartServices: (coreSetupMock.getStartServices as jest.Mock).mockImplementation(
        async () => {
          return [
            {},
            {
              actions,
            },
          ];
        }
      ),
      isAvailable: jest.fn((): boolean => true),
      logger: loggerMock.create(),
    },
  };
};

const createTools = () => {
  const clients = createMockClients();
  const context = createRequestContextMock(clients);

  return { clients, context };
};

export const requestContextMock = {
  create: createRequestContextMock,
  convertContext: convertRequestContextMock,
  createTools,
};
