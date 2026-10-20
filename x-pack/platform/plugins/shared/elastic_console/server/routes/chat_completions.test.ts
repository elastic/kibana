/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type {
  CoreSetup,
  IRouter,
  KibanaRequest,
  RequestHandler,
  RouteConfig,
} from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { MAX_CONTENT_PARTS, MAX_MESSAGES, registerChatCompletionsRoute } from './chat_completions';

const setup = () => {
  const chatComplete = jest
    .fn()
    .mockImplementation(({ stream }: { stream: boolean }) =>
      stream ? of() : Promise.resolve({ content: 'hi', toolCalls: [] })
    );
  const inference = {
    getClient: jest.fn().mockReturnValue({ chatComplete }),
    getConnectorById: jest.fn().mockResolvedValue({ connectorId: 'my-connector' }),
    getDefaultConnector: jest.fn(),
  };
  const coreStart = {
    featureFlags: { getBooleanValue$: jest.fn().mockReturnValue(of(true)) },
    savedObjects: { getScopedClient: jest.fn() },
    uiSettings: { asScopedToClient: jest.fn().mockReturnValue({ get: async () => true }) },
  };
  const coreSetup = {
    getStartServices: async () => [coreStart, { inference }, {}],
  } as unknown as CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;

  let handler: RequestHandler | undefined;
  let routeConfig: RouteConfig<unknown, unknown, unknown, 'post'> | undefined;
  const router = {
    post: (
      config: RouteConfig<unknown, unknown, unknown, 'post'>,
      routeHandler: RequestHandler
    ) => {
      routeConfig = config;
      handler = routeHandler;
    },
  } as unknown as IRouter;

  registerChatCompletionsRoute({ router, coreSetup, logger: loggingSystemMock.createLogger() });

  const call = async ({
    body,
    headers = {},
  }: {
    body: Record<string, unknown>;
    headers?: Record<string, string>;
  }) => {
    if (!handler) {
      throw new Error('route not registered');
    }
    const response = httpServerMock.createResponseFactory();
    await handler(
      {} as never,
      httpServerMock.createKibanaRequest({
        body: { model: 'my-connector', messages: [{ role: 'user', content: 'hi' }], ...body },
        headers,
      }) as KibanaRequest,
      response
    );
    return response;
  };

  return { chatComplete, call, getRouteConfig: () => routeConfig };
};

describe('chat completions route config', () => {
  it('accepts request bodies up to 20MB', () => {
    const { getRouteConfig } = setup();
    expect(getRouteConfig()?.options?.body?.maxBytes).toBe(20 * 1024 * 1024);
  });

  const validateBody = (body: Record<string, unknown>) => {
    const validate = setup().getRouteConfig()?.validate;
    if (!validate || typeof validate === 'function' || !validate.body) {
      throw new Error('missing body validation');
    }
    return (validate.body as { validate: (value: unknown) => unknown }).validate(body);
  };

  it('accepts long conversations up to MAX_MESSAGES messages', () => {
    const message = { role: 'user', content: 'hi' };
    expect(() =>
      validateBody({ messages: Array.from({ length: MAX_MESSAGES }, () => message) })
    ).not.toThrow();
    expect(() =>
      validateBody({ messages: Array.from({ length: MAX_MESSAGES + 1 }, () => message) })
    ).toThrow();
  });

  it('accepts messages with up to MAX_CONTENT_PARTS content parts', () => {
    const part = { type: 'text', text: 'hi' };
    const content = (length: number) => Array.from({ length }, () => part);
    expect(() =>
      validateBody({ messages: [{ role: 'user', content: content(MAX_CONTENT_PARTS) }] })
    ).not.toThrow();
    expect(() =>
      validateBody({ messages: [{ role: 'user', content: content(MAX_CONTENT_PARTS + 1) }] })
    ).toThrow();
  });
});

describe('chat completions route prompt caching', () => {
  it.each([true, false])(
    'forwards prompt_cache_key as the session id (stream: %s)',
    async (stream) => {
      const { chatComplete, call } = setup();
      await call({ body: { stream, prompt_cache_key: 'ses_1' } });

      expect(chatComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'my-connector',
          sessionId: 'ses_1',
          cacheControl: { type: 'ephemeral', ttl: '5m' },
          stream,
        })
      );
    }
  );

  it('forwards the x-session-id header as the session id', async () => {
    const { chatComplete, call } = setup();
    await call({ body: { stream: true }, headers: { 'x-session-id': 'ses_2' } });

    expect(chatComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'ses_2',
        cacheControl: { type: 'ephemeral', ttl: '5m' },
      })
    );
  });

  it('does not set prompt caching options without a session id', async () => {
    const { chatComplete, call } = setup();
    await call({ body: { stream: false } });

    const [[options]] = chatComplete.mock.calls;
    expect(options).not.toHaveProperty('sessionId');
    expect(options).not.toHaveProperty('cacheControl');
  });
});
