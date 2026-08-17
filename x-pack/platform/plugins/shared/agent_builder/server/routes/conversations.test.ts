/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ConversationAccessControlMode,
  ConversationRoundStatus,
  ConversationOriginType,
} from '@kbn/agent-builder-common';
import type { Conversation } from '@kbn/agent-builder-common';
import { publicApiPath } from '../../common/constants';
import { registerConversationRoutes } from './conversations';

const GET_CONVERSATION_PATH = `${publicApiPath}/conversations/{conversation_id}`;

describe('registerConversationRoutes', () => {
  it('returns stored origin and author details when getting a conversation', async () => {
    let getConversationHandler: ((ctx: any, req: any, res: any) => Promise<any>) | undefined;
    const conversation = {
      id: 'conversation-1',
      agent_id: 'agent-1',
      user: {
        id: 'user-1',
        username: 'bruno',
      },
      title: 'Slack conversation',
      created_at: '2026-07-10T00:00:00.000Z',
      updated_at: '2026-07-10T00:00:01.000Z',
      origin: {
        external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      },
      rounds: [
        {
          id: 'round-1',
          status: ConversationRoundStatus.completed,
          input: {
            message: 'hello',
          },
          origin: {
            type: ConversationOriginType.Slack,
          },
          author: {
            id: 'U123',
            full_name: 'Bruno',
          },
          steps: [],
          response: {
            message: 'hi',
          },
          started_at: '2026-07-10T00:00:00.000Z',
          time_to_first_token: 1,
          time_to_last_token: 2,
          model_usage: {
            connector_id: 'connector-1',
            llm_calls: 1,
            input_tokens: 2,
            output_tokens: 3,
          },
        },
      ],
    } as Conversation;
    const get = jest.fn().mockResolvedValue(conversation);
    const getConversationWithPermissions = jest.fn().mockImplementation((value) => ({
      ...value,
      permissions: { rename: true, delete: true, update_access_control: true },
    }));

    const router = {
      versioned: {
        get: jest.fn().mockImplementation((config: { path: string }) => ({
          addVersion: jest
            .fn()
            .mockImplementation(
              (
                _versionConfig: unknown,
                handler: (ctx: any, req: any, res: any) => Promise<any>
              ) => {
                if (config.path === GET_CONVERSATION_PATH) {
                  getConversationHandler = handler;
                }
              }
            ),
        })),
        delete: jest.fn().mockImplementation(() => ({
          addVersion: jest.fn(),
        })),
        put: jest.fn().mockImplementation(() => ({
          addVersion: jest.fn(),
        })),
      },
    };

    registerConversationRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        conversations: {
          getScopedClient: jest.fn().mockResolvedValue({ get, getConversationWithPermissions }),
        },
      }),
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = {
      ok: jest.fn(({ body }) => ({ status: 200, payload: body })),
      forbidden: jest.fn(),
      customError: jest.fn(),
      notFound: jest.fn(),
    };

    const result = await getConversationHandler!(
      {
        core: Promise.resolve({}),
        licensing: Promise.resolve({
          license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
        }),
      },
      {
        params: {
          conversation_id: 'conversation-1',
        },
      },
      response
    );

    expect(get).toHaveBeenCalledWith('conversation-1');
    expect(getConversationWithPermissions).toHaveBeenCalledWith(conversation);
    expect(result.payload).toEqual({
      ...conversation,
      permissions: { rename: true, delete: true, update_access_control: true },
    });
    expect(result.payload.origin).toEqual({
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
    });
    expect(result.payload.rounds[0].origin).toEqual({
      type: ConversationOriginType.Slack,
    });
    expect(result.payload.rounds[0].author).toEqual({
      id: 'U123',
      full_name: 'Bruno',
    });
  });

  it('returns stored origin details when listing conversations', async () => {
    let listConversationsHandler: ((ctx: any, req: any, res: any) => Promise<any>) | undefined;
    const conversation = {
      id: 'conversation-1',
      agent_id: 'agent-1',
      user: {
        id: 'user-1',
        username: 'bruno',
      },
      title: 'Slack conversation',
      created_at: '2026-07-10T00:00:00.000Z',
      updated_at: '2026-07-10T00:00:01.000Z',
      origin: {
        external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      },
    };
    const list = jest.fn().mockResolvedValue([conversation]);
    const getConversationWithPermissions = jest.fn().mockImplementation((value) => ({
      ...value,
      permissions: { rename: true, delete: true, update_access_control: true },
    }));

    const router = {
      versioned: {
        get: jest.fn().mockImplementation((config: { path: string }) => ({
          addVersion: jest
            .fn()
            .mockImplementation(
              (
                _versionConfig: unknown,
                handler: (ctx: any, req: any, res: any) => Promise<any>
              ) => {
                if (config.path === `${publicApiPath}/conversations`) {
                  listConversationsHandler = handler;
                }
              }
            ),
        })),
        delete: jest.fn().mockImplementation(() => ({
          addVersion: jest.fn(),
        })),
        put: jest.fn().mockImplementation(() => ({
          addVersion: jest.fn(),
        })),
      },
    };

    registerConversationRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        conversations: {
          getScopedClient: jest.fn().mockResolvedValue({ list, getConversationWithPermissions }),
        },
      }),
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = {
      ok: jest.fn(({ body }) => ({ status: 200, payload: body })),
      forbidden: jest.fn(),
      customError: jest.fn(),
      notFound: jest.fn(),
    };

    const result = await listConversationsHandler!(
      {
        core: Promise.resolve({}),
        licensing: Promise.resolve({
          license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
        }),
      },
      {
        query: {},
      },
      response
    );

    expect(list).toHaveBeenCalledWith({ agentId: undefined });
    expect(getConversationWithPermissions).toHaveBeenCalledWith(conversation);
    expect(result.payload.results[0].origin).toEqual({
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
    });
    expect(result.payload.results[0].permissions).toEqual({
      rename: true,
      delete: true,
      update_access_control: true,
    });
  });

  it('reports rename and delete permissions for an admin viewing a public conversation owned by another user', async () => {
    let getConversationHandler: ((ctx: any, req: any, res: any) => Promise<any>) | undefined;
    let listConversationsHandler: ((ctx: any, req: any, res: any) => Promise<any>) | undefined;
    const conversation = {
      id: 'conversation-1',
      agent_id: 'agent-1',
      user: { id: 'conversation-owner', username: 'owner' },
      title: 'Public conversation',
      created_at: '2026-07-10T00:00:00.000Z',
      updated_at: '2026-07-10T00:00:01.000Z',
      access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
      rounds: [],
    } as Conversation;
    const get = jest.fn().mockResolvedValue(conversation);
    const list = jest.fn().mockResolvedValue([conversation]);

    const router = {
      versioned: {
        get: jest.fn().mockImplementation((config: { path: string }) => ({
          addVersion: jest
            .fn()
            .mockImplementation(
              (
                _versionConfig: unknown,
                handler: (ctx: any, req: any, res: any) => Promise<any>
              ) => {
                if (config.path === GET_CONVERSATION_PATH) {
                  getConversationHandler = handler;
                }
                if (config.path === `${publicApiPath}/conversations`) {
                  listConversationsHandler = handler;
                }
              }
            ),
        })),
        delete: jest.fn().mockImplementation(() => ({
          addVersion: jest.fn(),
        })),
        put: jest.fn().mockImplementation(() => ({
          addVersion: jest.fn(),
        })),
      },
    };

    registerConversationRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        conversations: {
          getScopedClient: jest.fn().mockResolvedValue({
            get,
            list,
            getConversationWithPermissions: jest.fn().mockImplementation((value) => ({
              ...value,
              permissions: { rename: true, delete: true, update_access_control: false },
            })),
          }),
        },
      }),
      logger: loggingSystemMock.createLogger(),
    } as never);

    const context = {
      core: Promise.resolve({}),
      licensing: Promise.resolve({
        license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
      }),
    };
    const response = {
      ok: jest.fn(({ body }) => ({ status: 200, payload: body })),
      forbidden: jest.fn(),
      customError: jest.fn(),
      notFound: jest.fn(),
    };

    const getResult = await getConversationHandler!(
      context,
      { params: { conversation_id: conversation.id } },
      response
    );
    const listResult = await listConversationsHandler!(context, { query: {} }, response);

    expect(getResult.payload.permissions).toEqual({
      rename: true,
      delete: true,
      update_access_control: false,
    });
    expect(listResult.payload.results[0].permissions).toEqual({
      rename: true,
      delete: true,
      update_access_control: false,
    });
  });

  describe('access control routes', () => {
    const registerAndCapture = ({
      method,
      path,
      client,
    }: {
      method: 'get' | 'put';
      path: string;
      client: Record<string, jest.Mock>;
    }) => {
      let capturedHandler: ((ctx: any, req: any, res: any) => Promise<any>) | undefined;

      const captureFor = (routeMethod: 'get' | 'put' | 'delete') =>
        jest.fn().mockImplementation((config: { path: string }) => ({
          addVersion: jest
            .fn()
            .mockImplementation(
              (
                _versionConfig: unknown,
                handler: (ctx: any, req: any, res: any) => Promise<any>
              ) => {
                if (routeMethod === method && config.path === path) {
                  capturedHandler = handler;
                }
              }
            ),
        }));

      registerConversationRoutes({
        router: {
          versioned: {
            get: captureFor('get'),
            put: captureFor('put'),
            delete: captureFor('delete'),
          },
        },
        getInternalServices: jest.fn().mockReturnValue({
          conversations: { getScopedClient: jest.fn().mockResolvedValue(client) },
        }),
        logger: loggingSystemMock.createLogger(),
      } as never);

      return capturedHandler!;
    };

    const context = {
      core: Promise.resolve({}),
      licensing: Promise.resolve({
        license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
      }),
    };

    const response = () => ({
      ok: jest.fn(({ body }) => ({ status: 200, payload: body })),
      forbidden: jest.fn(),
      customError: jest.fn(),
      notFound: jest.fn(),
    });

    it('passes the requested mode and entries through when updating access control', async () => {
      const body = {
        access_mode: 'private',
        entries: [{ type: 'user', id: 'user-2', role: 'member' }],
      };
      const persisted = {
        access_mode: 'private',
        entries: [{ ...body.entries[0], added_at: '2026-08-11T10:00:00.000Z' }],
      };
      const updateAccessControl = jest.fn().mockResolvedValue(persisted);
      const handler = registerAndCapture({
        method: 'put',
        path: `${publicApiPath}/conversations/{conversation_id}/access_control`,
        client: { updateAccessControl },
      });

      const result = await handler(
        context,
        { params: { conversation_id: 'conversation-1' }, body },
        response()
      );

      expect(updateAccessControl).toHaveBeenCalledWith('conversation-1', body);
      expect(result.payload).toBe(persisted);
    });
  });
});
