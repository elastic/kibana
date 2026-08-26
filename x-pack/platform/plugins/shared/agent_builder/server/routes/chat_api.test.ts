/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ChatEventType } from '@kbn/agent-builder-common';
import { chatApiPath } from '../../common/constants';
import { registerChatApiRoutes } from './chat_api';

const conversationCreatedEvent = {
  type: ChatEventType.conversationCreated,
  data: { conversation_id: 'conv-1', access_control: { access_mode: 'private', entries: [] } },
};

const activeContext = (flagEnabled: boolean) => ({
  core: Promise.resolve({
    uiSettings: { client: { get: jest.fn().mockResolvedValue(flagEnabled) } },
  }),
  licensing: Promise.resolve({
    license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
  }),
});

const buildResponse = () => ({
  ok: jest.fn(({ body }: { body: unknown }) => ({ status: 200, payload: body })),
  notFound: jest.fn(() => ({ status: 404 })),
  customError: jest.fn(({ body, statusCode }: { body: unknown; statusCode: number }) => ({
    status: statusCode,
    payload: body,
  })),
  forbidden: jest.fn(() => ({ status: 403 })),
});

// Captures the handler registered for a given path so the test can invoke it directly.
const captureHandlers = () => {
  const handlers: Record<string, Function> = {};
  const router = {
    versioned: {
      post: jest.fn().mockImplementation((config: { path: string }) => ({
        addVersion: jest.fn().mockImplementation((_v: unknown, handler: Function) => {
          handlers[config.path] = handler;
        }),
      })),
    },
  };
  return { router, handlers };
};

describe('registerChatApiRoutes', () => {
  it('registers the two /api/chat converse routes as public + experimental', () => {
    const postConfigs: Array<{ path: string; access?: string; options?: any }> = [];
    const router = {
      versioned: {
        post: jest.fn().mockImplementation((config: { path: string }) => {
          postConfigs.push(config);
          return { addVersion: jest.fn() };
        }),
      },
    };

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn(),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    expect(postConfigs).toContainEqual(
      expect.objectContaining({
        path: `${chatApiPath}/converse`,
        access: 'public',
        options: expect.objectContaining({
          availability: expect.objectContaining({ stability: 'experimental' }),
        }),
      })
    );
    expect(postConfigs).toContainEqual(
      expect.objectContaining({ path: `${chatApiPath}/converse/async`, access: 'public' })
    );
  });

  it('returns the conversation with its timeline after a sync converse', async () => {
    const { router, handlers } = captureHandlers();
    const executeAgent = jest.fn().mockResolvedValue({ events$: of(conversationCreatedEvent) });
    const conversation = { id: 'conv-1', events: [{ id: 'e1' }], rounds: [] };
    const get = jest.fn().mockResolvedValue(conversation);
    const getScopedClient = jest.fn().mockResolvedValue({ get });

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { executeAgent },
        conversations: { getScopedClient },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const result = await handlers[`${chatApiPath}/converse`](
      activeContext(true),
      { body: { agent_id: 'agent-1', input: 'Hello' } },
      response
    );

    expect(executeAgent).toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith('conv-1');
    expect(result).toEqual({ status: 200, payload: conversation });
  });

  it('404s when the experimental feature flag is disabled', async () => {
    const { router, handlers } = captureHandlers();
    const executeAgent = jest.fn();

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { executeAgent },
        conversations: { getScopedClient: jest.fn() },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const result = await handlers[`${chatApiPath}/converse`](
      activeContext(false),
      { body: { agent_id: 'agent-1', input: 'Hello' } },
      response
    );

    expect(response.notFound).toHaveBeenCalled();
    expect(result).toEqual({ status: 404 });
    expect(executeAgent).not.toHaveBeenCalled();
  });

  it('returns a 500 when the run emits no conversation event', async () => {
    const { router, handlers } = captureHandlers();
    const executeAgent = jest.fn().mockResolvedValue({ events$: of() });
    const get = jest.fn();

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { executeAgent },
        conversations: { getScopedClient: jest.fn().mockResolvedValue({ get }) },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const result = await handlers[`${chatApiPath}/converse`](
      activeContext(true),
      { body: { agent_id: 'agent-1', input: 'Hello' } },
      response
    );

    expect(result.status).toBe(500);
    expect(get).not.toHaveBeenCalled();
  });

  it('surfaces a 500 when the agent stream errors mid-run', async () => {
    const { router, handlers } = captureHandlers();
    const executeAgent = jest
      .fn()
      .mockResolvedValue({ events$: throwError(() => new Error('stream boom')) });

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { executeAgent },
        conversations: { getScopedClient: jest.fn() },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const result = await handlers[`${chatApiPath}/converse`](
      activeContext(true),
      { body: { agent_id: 'agent-1', input: 'Hello' } },
      response
    );

    expect(result.status).toBe(500);
  });

  it('404s the streaming route when the experimental feature flag is disabled', async () => {
    const { router, handlers } = captureHandlers();
    const executeAgent = jest.fn();

    registerChatApiRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { executeAgent },
        conversations: { getScopedClient: jest.fn() },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = buildResponse();
    const result = await handlers[`${chatApiPath}/converse/async`](
      activeContext(false),
      { body: { agent_id: 'agent-1', input: 'Hello' } },
      response
    );

    expect(response.notFound).toHaveBeenCalled();
    expect(result).toEqual({ status: 404 });
    expect(executeAgent).not.toHaveBeenCalled();
  });
});
