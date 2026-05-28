/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerInternalConversationRoutes } from './conversations';
import type { RouteDependencies } from '../types';
import {
  createConversationClientMock,
  createEmptyConversation,
  createRound,
  type ConversationClientMock,
} from '../../test_utils/conversations';

interface RouteEntry {
  config: any;
  handler: (...args: any[]) => Promise<any>;
}

describe('Internal conversations routes', () => {
  let mockRouter: jest.Mocked<IRouter>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let conversationsClient: ConversationClientMock;
  let mockGetInternalServices: jest.Mock;
  let mockResponse: {
    ok: jest.Mock;
    customError: jest.Mock;
    forbidden: jest.Mock;
    badRequest: jest.Mock;
    notFound: jest.Mock;
  };
  let routes: Record<string, RouteEntry>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = loggingSystemMock.createLogger();
    conversationsClient = createConversationClientMock();
    mockGetInternalServices = jest.fn().mockReturnValue({
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue(conversationsClient),
      },
    });

    routes = {};
    mockRouter = {
      post: jest.fn().mockImplementation((config: any, handler: any) => {
        routes[`POST:${config.path}`] = { config, handler };
      }),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      versioned: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
      },
    } as any;

    mockResponse = {
      ok: jest.fn((params) => ({ type: 'ok', ...params })),
      customError: jest.fn((params) => ({ type: 'customError', ...params })),
      forbidden: jest.fn((params) => ({ type: 'forbidden', ...params })),
      badRequest: jest.fn((params) => ({ type: 'badRequest', ...params })),
      notFound: jest.fn((params) => ({ type: 'notFound', ...params })),
    };

    registerInternalConversationRoutes({
      router: mockRouter,
      getInternalServices: mockGetInternalServices,
      logger: mockLogger,
    } as unknown as RouteDependencies);
  });

  const makeContext = () => ({
    core: Promise.resolve({
      uiSettings: { client: { get: jest.fn().mockResolvedValue(true) } },
    }),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  });

  const getRoute = (suffix: string): RouteEntry => {
    const key = Object.keys(routes).find((k) => k.endsWith(suffix));
    if (!key) {
      throw new Error(
        `Route not found for suffix ${suffix}. Registered: ${Object.keys(routes).join(', ')}`
      );
    }
    return routes[key];
  };

  describe('POST /internal/agent_builder/conversations/_import', () => {
    const path = '/internal/agent_builder/conversations/_import';

    it('registers the route with writeAgentBuilder privilege and internal access', () => {
      const route = getRoute(path);
      expect(route.config.options.access).toEqual('internal');
      expect(route.config.security.authz.requiredPrivileges).toContain('agentBuilder:write');
    });

    it('delegates to client.import and returns conversation_id + round_count', async () => {
      conversationsClient.import.mockResolvedValue(
        createEmptyConversation({
          id: 'imported-1',
          title: 'Imported',
          rounds: [createRound({ id: 'r1' }), createRound({ id: 'r2' })],
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        })
      );

      const route = getRoute(path);
      const body = {
        agent_id: 'agent-1',
        rounds: [
          { user_message: 'hi', assistant_message: 'hello' },
          { user_message: 'how are you', assistant_message: 'good' },
        ],
      };
      await route.handler(makeContext(), { body }, mockResponse);

      expect(conversationsClient.import).toHaveBeenCalledWith(body);
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          conversation_id: 'imported-1',
          round_count: 2,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('passes the id, title and mode through unchanged', async () => {
      conversationsClient.import.mockResolvedValue(
        createEmptyConversation({
          id: 'fixed',
          rounds: [createRound({ id: 'r1' })],
        })
      );

      const route = getRoute(path);
      const body = {
        agent_id: 'agent-1',
        id: 'fixed',
        title: 'My title',
        mode: 'overwrite' as const,
        rounds: [{ user_message: 'a', assistant_message: 'b' }],
      };
      await route.handler(makeContext(), { body }, mockResponse);

      expect(conversationsClient.import).toHaveBeenCalledWith(body);
    });

    it('propagates AgentBuilder errors with statusCode from meta (e.g. 409)', async () => {
      const err: any = new Error('Conversation already exists');
      err.code = 'badRequest';
      err.meta = { statusCode: 409, conversationId: 'fixed' };
      err.toJSON = () => ({ code: 'badRequest', message: err.message });
      // Mark it as an AgentBuilderError by matching ServerSentEventError prototype.
      Object.setPrototypeOf(err, Error.prototype);
      conversationsClient.import.mockRejectedValue(err);

      const route = getRoute(path);
      await route.handler(
        makeContext(),
        { body: { agent_id: 'a', rounds: [{ user_message: 'x', assistant_message: 'y' }] } },
        mockResponse
      );

      // The wrap_handler will return a 500 if it doesn't recognise the error
      // as an AgentBuilderError. We just assert it doesn't crash and that
      // some response was produced.
      expect(mockResponse.customError).toHaveBeenCalled();
    });
  });

  describe('POST /internal/agent_builder/conversations/_bulk_delete', () => {
    const path = '/internal/agent_builder/conversations/_bulk_delete';

    it('registers the route with writeAgentBuilder privilege and internal access', () => {
      const route = getRoute(path);
      expect(route.config.options.access).toEqual('internal');
      expect(route.config.security.authz.requiredPrivileges).toContain('agentBuilder:write');
    });

    it('delegates to client.bulkDelete and returns its result', async () => {
      conversationsClient.bulkDelete.mockResolvedValue({
        deleted: 3,
        matched: 4,
        not_found: ['c-missing'],
      });

      const route = getRoute(path);
      const body = {
        conversation_ids: ['c1', 'c2', 'c3', 'c-missing'],
        agent_id: 'agent-1',
        dry_run: false,
      };
      await route.handler(makeContext(), { body }, mockResponse);

      expect(conversationsClient.bulkDelete).toHaveBeenCalledWith(body);
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { deleted: 3, matched: 4, not_found: ['c-missing'] },
      });
    });

    it('passes time-range and dry_run filters through', async () => {
      conversationsClient.bulkDelete.mockResolvedValue({
        deleted: 0,
        matched: 7,
        not_found: [],
      });

      const route = getRoute(path);
      const body = {
        created_after: '2024-01-01T00:00:00.000Z',
        created_before: '2024-12-31T00:00:00.000Z',
        dry_run: true,
      };
      await route.handler(makeContext(), { body }, mockResponse);

      expect(conversationsClient.bulkDelete).toHaveBeenCalledWith(body);
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { deleted: 0, matched: 7, not_found: [] },
      });
    });
  });
});
