/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ConversationRoundStatus, ConversationOriginType } from '@kbn/agent-builder-common';
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
      },
    };

    registerConversationRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        conversations: {
          getScopedClient: jest.fn().mockResolvedValue({ get }),
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
    expect(result.payload).toBe(conversation);
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
      },
    };

    registerConversationRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        conversations: {
          getScopedClient: jest.fn().mockResolvedValue({ list }),
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
    expect(result.payload.results[0].origin).toEqual({
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
    });
  });
});
