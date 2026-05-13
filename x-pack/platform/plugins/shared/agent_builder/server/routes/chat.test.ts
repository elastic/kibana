/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { of } from 'rxjs';
import {
  AgentExecutionMode,
  ChatEventType,
  ConversationRoundStatus,
  isAgentBuilderError,
} from '@kbn/agent-builder-common';
import { registerChatRoutes } from './chat';
import type { RouteDependencies } from './types';

interface RouteEntry {
  config: any;
  versionConfig: any;
  handler: (...args: any[]) => Promise<any>;
}

describe('Chat routes: persist flag', () => {
  let mockRouter: jest.Mocked<IRouter>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let executionService: {
    executeAgent: jest.Mock;
  };
  let mockGetInternalServices: jest.Mock;
  let mockCoreSetup: { getStartServices: jest.Mock };
  let mockResponse: {
    ok: jest.Mock;
    customError: jest.Mock;
    badRequest: jest.Mock;
  };
  let routes: Record<string, RouteEntry>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = loggingSystemMock.createLogger();

    executionService = {
      executeAgent: jest.fn(),
    };
    mockGetInternalServices = jest.fn().mockReturnValue({
      execution: executionService,
      tools: {
        getRegistry: jest.fn().mockResolvedValue({}),
      },
    });
    mockCoreSetup = {
      getStartServices: jest.fn().mockResolvedValue([{}, { cloud: undefined }]),
    };

    routes = {};
    const registerVersioned = (method: string) => (config: any) => {
      const versioned: any = {
        addVersion: jest.fn().mockImplementation((versionConfig: any, handler: any) => {
          routes[`${method}:${config.path}`] = { config, versionConfig, handler };
          return versioned;
        }),
      };
      return versioned;
    };

    mockRouter = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      versioned: {
        get: jest.fn(registerVersioned('GET')),
        post: jest.fn(registerVersioned('POST')),
        put: jest.fn(registerVersioned('PUT')),
        delete: jest.fn(registerVersioned('DELETE')),
        patch: jest.fn(registerVersioned('PATCH')),
      } as any,
    } as any;

    mockResponse = {
      ok: jest.fn((params) => ({ type: 'ok', ...params })),
      customError: jest.fn((params) => ({ type: 'customError', ...params })),
      badRequest: jest.fn((params) => ({ type: 'badRequest', ...params })),
    };

    registerChatRoutes({
      router: mockRouter,
      getInternalServices: mockGetInternalServices,
      coreSetup: mockCoreSetup,
      logger: mockLogger,
    } as unknown as RouteDependencies);
  });

  const ctx = () => ({
    core: Promise.resolve({
      uiSettings: { client: { get: jest.fn().mockResolvedValue(true) } },
    }),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  });

  const makeRequest = (body: Record<string, any>) => ({
    body,
    events: { aborted$: of(undefined) },
  });

  const getConverseHandler = () => {
    const entry = routes['POST:/api/agent_builder/converse'];
    if (!entry) throw new Error('converse route not registered');
    return entry.handler;
  };

  const fakeRoundCompleteEvent = () => ({
    type: ChatEventType.roundComplete,
    data: {
      round: {
        id: 'round-1',
        status: ConversationRoundStatus.completed,
        input: { message: 'hi' },
        response: { message: 'hello' },
        steps: [],
        started_at: '2024-01-01T00:00:00.000Z',
        time_to_first_token: 0,
        time_to_last_token: 0,
        model_usage: {
          connector_id: 'c1',
          llm_calls: 1,
          input_tokens: 1,
          output_tokens: 1,
        },
      },
    },
  });

  it('passes storeConversation=true and autoCreateConversationWithId=true by default', async () => {
    executionService.executeAgent.mockResolvedValue({
      executionId: 'e1',
      events$: of(fakeRoundCompleteEvent(), {
        type: ChatEventType.conversationCreated,
        data: { conversation_id: 'conv-new', title: 'New' },
      }),
    });

    const handler = getConverseHandler();
    await handler(ctx(), makeRequest({ agent_id: 'a', input: 'hi' }), mockResponse);

    expect(executionService.executeAgent).toHaveBeenCalledTimes(1);
    const call = executionService.executeAgent.mock.calls[0][0];
    expect(call.mode).toEqual(AgentExecutionMode.conversation);
    expect(call.params.storeConversation).toEqual(true);
    expect(call.params.autoCreateConversationWithId).toEqual(true);

    expect(mockResponse.ok).toHaveBeenCalled();
    const body = mockResponse.ok.mock.calls[0][0].body;
    expect(body.conversation_id).toEqual('conv-new');
    expect(body.round_id).toEqual('round-1');
  });

  it('passes storeConversation=false and autoCreateConversationWithId=false when persist=false', async () => {
    executionService.executeAgent.mockResolvedValue({
      executionId: 'e1',
      events$: of(fakeRoundCompleteEvent()),
    });

    const handler = getConverseHandler();
    await handler(ctx(), makeRequest({ agent_id: 'a', input: 'hi', persist: false }), mockResponse);

    const call = executionService.executeAgent.mock.calls[0][0];
    expect(call.params.storeConversation).toEqual(false);
    expect(call.params.autoCreateConversationWithId).toEqual(false);
  });

  it('returns an empty conversation_id when persist=false and no conversation event is emitted', async () => {
    executionService.executeAgent.mockResolvedValue({
      executionId: 'e1',
      events$: of(fakeRoundCompleteEvent()),
    });

    const handler = getConverseHandler();
    await handler(ctx(), makeRequest({ agent_id: 'a', input: 'hi', persist: false }), mockResponse);

    const body = mockResponse.ok.mock.calls[0][0].body;
    expect(body.conversation_id).toEqual('');
    expect(body.round_id).toEqual('round-1');
  });

  it('rejects persist=false combined with conversation_id', async () => {
    const handler = getConverseHandler();
    let caught: any;
    try {
      await handler(
        ctx(),
        makeRequest({
          agent_id: 'a',
          input: 'hi',
          persist: false,
          conversation_id: '00000000-0000-0000-0000-000000000000',
        }),
        mockResponse
      );
    } catch (e) {
      caught = e;
    }

    // The wrap_handler converts AgentBuilderError into a customError response;
    // either path is acceptable here as long as executeAgent is NOT called.
    expect(executionService.executeAgent).not.toHaveBeenCalled();
    const errored = caught || mockResponse.customError.mock.calls[0]?.[0];
    expect(errored).toBeTruthy();
    // The error message should mention conversation_id.
    const message =
      (caught && caught.message) ||
      (mockResponse.customError.mock.calls[0]?.[0]?.body?.message ?? '');
    expect(String(message)).toMatch(/conversation_id/);
  });

  it('rejects persist=false combined with action', async () => {
    const handler = getConverseHandler();
    let caught: any;
    try {
      await handler(
        ctx(),
        makeRequest({
          agent_id: 'a',
          input: 'hi',
          persist: false,
          action: 'regenerate',
        }),
        mockResponse
      );
    } catch (e) {
      caught = e;
    }

    expect(executionService.executeAgent).not.toHaveBeenCalled();
    // The action check fires before persist; either error is acceptable.
    const message =
      (caught && caught.message) ||
      (mockResponse.customError.mock.calls[0]?.[0]?.body?.message ?? '');
    expect(String(message)).toMatch(/(action|conversation_id|persist)/);
    if (caught) {
      expect(isAgentBuilderError(caught)).toBe(true);
    }
  });
});
