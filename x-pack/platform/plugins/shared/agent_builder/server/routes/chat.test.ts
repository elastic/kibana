/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ConversationSourceType, ExecutionStatus } from '@kbn/agent-builder-common';
import { of } from 'rxjs';
import { internalApiPath } from '../../common/constants';
import {
  callbackConversePayloadSchema,
  conversePayloadSchema,
  promptResponseEntrySchema,
  registerChatRoutes,
} from './chat';

describe('promptResponseEntrySchema', () => {
  it('accepts the confirmation variant', () => {
    expect(() => promptResponseEntrySchema.validate({ allow: true })).not.toThrow();
    expect(() => promptResponseEntrySchema.validate({ allow: false })).not.toThrow();
  });

  it('accepts the authorization variant', () => {
    expect(() => promptResponseEntrySchema.validate({ authorized: true })).not.toThrow();
  });

  it('accepts ask_user_question answers — choice only', () => {
    expect(() => promptResponseEntrySchema.validate({ answers: [{ choice: [0] }] })).not.toThrow();
  });

  it('accepts ask_user_question answers — custom only', () => {
    expect(() =>
      promptResponseEntrySchema.validate({ answers: [{ custom: 'hello' }] })
    ).not.toThrow();
  });

  it('accepts ask_user_question answers — choice + custom combined', () => {
    expect(() =>
      promptResponseEntrySchema.validate({
        answers: [{ choice: [0, 2], custom: 'extra' }],
      })
    ).not.toThrow();
  });

  it('accepts ask_user_question answers — skipped', () => {
    expect(() =>
      promptResponseEntrySchema.validate({ answers: [{ skipped: true }] })
    ).not.toThrow();
  });

  it('accepts a mixed answers array spanning all variants', () => {
    expect(() =>
      promptResponseEntrySchema.validate({
        answers: [
          { choice: [0] },
          { skipped: true },
          { custom: 'free text' },
          { choice: [1, 3], custom: 'mixed' },
        ],
      })
    ).not.toThrow();
  });

  it('rejects unknown payload shapes', () => {
    expect(() => promptResponseEntrySchema.validate({ foo: 'bar' })).toThrow();
  });
});

describe('conversePayloadSchema', () => {
  it('rejects unsupported conversation access mode values', () => {
    expect(() =>
      conversePayloadSchema.validate({
        input: 'Unsupported access mode test',
        access_control: {
          access_mode: 'shared',
        },
      })
    ).toThrow(/access_mode/);
  });
});

describe('callbackConversePayloadSchema', () => {
  const basePayload = {
    agent_id: 'agent-1',
    input: 'Hello',
    source: {
      type: 'slack',
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
    },
    callback: {
      url: 'https://relay.example.com/events?token=abc',
      signing_secret: 'signing-secret',
    },
  };

  it('accepts source and callback signing fields', () => {
    expect(() => callbackConversePayloadSchema.validate(basePayload)).not.toThrow();
  });

  it('requires source for stateless conversation resolution', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        source: undefined,
      })
    ).toThrow(/source/);
  });

  it('rejects unsupported source types', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        source: {
          type: 'teams',
          external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
        },
      })
    ).toThrow(/source/);
  });

  it('limits external conversation id length', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        source: {
          type: 'slack',
          external_conversation_id: 'x'.repeat(1025),
        },
      })
    ).toThrow(/external_conversation_id/);
  });

  it('requires callback signing secret for HMAC signing', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        callback: {
          url: 'https://relay.example.com/events?token=abc',
        },
      })
    ).toThrow(/signing_secret/);
  });

  it('does not accept legacy callback secret field', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        callback: {
          url: 'https://relay.example.com/events?token=abc',
          secret: 'signing-secret',
        },
      })
    ).toThrow(/signing_secret/);
  });

  it('limits callback signing secret length', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        callback: {
          url: 'https://relay.example.com/events?token=abc',
          signing_secret: 'x'.repeat(1025),
        },
      })
    ).toThrow(/signing_secret/);
  });

  it('limits callback URL length', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        callback: {
          url: `https://relay.example.com/events?token=${'x'.repeat(2048)}`,
          signing_secret: 'signing-secret',
        },
      })
    ).toThrow(/url/);
  });

  it('requires a valid HTTP or HTTPS callback URL', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        callback: {
          url: 'ftp://relay.example.com/events',
          signing_secret: 'signing-secret',
        },
      })
    ).toThrow(/url/);
  });
});

describe('registerChatRoutes', () => {
  it('registers an internal callback converse route', () => {
    const postConfigs: Array<{ path: string; access?: string }> = [];
    const createVersionedRoute = () => ({
      addVersion: jest.fn().mockReturnValue({ addVersion: jest.fn() }),
    });
    const router = {
      versioned: {
        post: jest.fn().mockImplementation((config: { path: string; access?: string }) => {
          postConfigs.push(config);
          return createVersionedRoute();
        }),
      },
    };

    registerChatRoutes({
      router,
      getInternalServices: jest.fn(),
      coreSetup: {} as never,
      logger: loggingSystemMock.createLogger(),
    } as never);

    expect(postConfigs).toContainEqual(
      expect.objectContaining({
        path: `${internalApiPath}/converse/callback`,
        access: 'internal',
      })
    );
  });

  it('schedules callback converse without a conversation id when source is new', async () => {
    const callbackPath = `${internalApiPath}/converse/callback`;
    let callbackHandler: ((ctx: any, req: any, res: any) => Promise<any>) | undefined;
    const executeAgent = jest.fn().mockResolvedValue({
      executionId: 'execution-1',
      events$: of(),
    });
    const findBySource = jest.fn().mockResolvedValue(undefined);
    const source = {
      type: ConversationSourceType.Slack,
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
    };

    const router = {
      versioned: {
        post: jest.fn().mockImplementation((config: { path: string }) => ({
          addVersion: jest
            .fn()
            .mockImplementation(
              (
                _versionConfig: unknown,
                handler: (ctx: any, req: any, res: any) => Promise<any>
              ) => {
                if (config.path === callbackPath) {
                  callbackHandler = handler;
                }
              }
            ),
        })),
      },
    };

    registerChatRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { executeAgent },
        conversations: {
          getScopedClient: jest.fn().mockResolvedValue({ findBySource }),
        },
      }),
      coreSetup: {} as never,
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = {
      accepted: jest.fn(({ body }) => ({ status: 202, payload: body })),
      forbidden: jest.fn(),
      customError: jest.fn(),
      notFound: jest.fn(),
    };
    const result = await callbackHandler!(
      {
        core: Promise.resolve({}),
        licensing: Promise.resolve({
          license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
        }),
        agentBuilder: Promise.resolve({
          spaces: { getSpaceId: jest.fn().mockReturnValue('default') },
        }),
      },
      {
        body: {
          agent_id: 'agent-1',
          input: 'Hello',
          source,
          callback: {
            url: 'https://relay.example.com/events?token=abc',
            signing_secret: 'secret-1',
          },
        },
      },
      response
    );

    expect(result).toEqual({
      status: 202,
      payload: { execution_id: 'execution-1', status: ExecutionStatus.scheduled },
    });
    expect(findBySource).toHaveBeenCalledWith(source);
    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        useTaskManager: true,
        metadata: {
          callback_url: 'https://relay.example.com/events?token=abc',
          callback_signing_secret: 'secret-1',
        },
        params: expect.objectContaining({
          conversationId: undefined,
          source,
        }),
      })
    );
  });

  it('schedules callback converse with the existing conversation id when source is found', async () => {
    const callbackPath = `${internalApiPath}/converse/callback`;
    let callbackHandler: ((ctx: any, req: any, res: any) => Promise<any>) | undefined;
    const executeAgent = jest.fn().mockResolvedValue({
      executionId: 'execution-1',
      events$: of(),
    });
    const findBySource = jest.fn().mockResolvedValue({ id: 'conversation-1' });
    const source = {
      type: ConversationSourceType.Slack,
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
    };

    const router = {
      versioned: {
        post: jest.fn().mockImplementation((config: { path: string }) => ({
          addVersion: jest
            .fn()
            .mockImplementation(
              (
                _versionConfig: unknown,
                handler: (ctx: any, req: any, res: any) => Promise<any>
              ) => {
                if (config.path === callbackPath) {
                  callbackHandler = handler;
                }
              }
            ),
        })),
      },
    };

    registerChatRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        execution: { executeAgent },
        conversations: {
          getScopedClient: jest.fn().mockResolvedValue({ findBySource }),
        },
      }),
      coreSetup: {} as never,
      logger: loggingSystemMock.createLogger(),
    } as never);

    await callbackHandler!(
      {
        core: Promise.resolve({}),
        licensing: Promise.resolve({
          license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
        }),
      },
      {
        body: {
          agent_id: 'agent-1',
          input: 'Hello',
          source,
          callback: {
            url: 'https://relay.example.com/events?token=abc',
            signing_secret: 'secret-1',
          },
        },
      },
      {
        accepted: jest.fn(({ body }) => ({ status: 202, payload: body })),
        forbidden: jest.fn(),
        customError: jest.fn(),
        notFound: jest.fn(),
      }
    );

    expect(findBySource).toHaveBeenCalledWith(source);
    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          conversationId: 'conversation-1',
          source,
        }),
      })
    );
  });
});
