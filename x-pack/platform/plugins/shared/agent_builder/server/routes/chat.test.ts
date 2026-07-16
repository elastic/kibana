/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ConversationOriginType, ExecutionStatus } from '@kbn/agent-builder-common';
import { of } from 'rxjs';
import { internalApiPath } from '../../common/constants';
import {
  callbackConversePayloadSchema,
  conversePayloadSchema,
  promptResponseEntrySchema,
  registerChatRoutes,
} from './chat';
import { isChatCallbackRequestBodyPayload } from '../../common/http_api/chat_callback';

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
    origin: {
      type: ConversationOriginType.Slack,
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
    },
    callback: {
      url: 'https://relay.example.com/events?token=abc',
    },
  };

  it('accepts origin and callback URL', () => {
    expect(() => callbackConversePayloadSchema.validate(basePayload)).not.toThrow();
  });

  it('accepts callback payloads without origin', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        origin: undefined,
      })
    ).not.toThrow();
  });

  it('accepts a origin author when provided', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        origin: {
          ...basePayload.origin,
          author: {
            id: 'U123',
            full_name: 'Jane Doe',
            username: 'jane',
          },
        },
      })
    ).not.toThrow();
  });

  it('requires origin author id when origin author is provided', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        origin: {
          ...basePayload.origin,
          author: {
            full_name: 'Jane Doe',
          },
        },
      })
    ).toThrow(/id/);
  });

  it('rejects unsupported origin types', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        origin: {
          type: 'teams',
          external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
        },
      })
    ).toThrow(/origin/);
  });

  it('limits external conversation id length', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        origin: {
          type: ConversationOriginType.Slack,
          external_conversation_id: 'x'.repeat(1025),
        },
      })
    ).toThrow(/external_conversation_id/);
  });

  it('limits callback URL length', () => {
    expect(() =>
      callbackConversePayloadSchema.validate({
        ...basePayload,
        callback: {
          url: `https://relay.example.com/events?token=${'x'.repeat(2048)}`,
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
        },
      })
    ).toThrow(/url/);
  });

  it('identifies callback request payloads', () => {
    expect(isChatCallbackRequestBodyPayload(basePayload)).toBe(true);
    expect(isChatCallbackRequestBodyPayload({ agent_id: 'agent-1', input: 'Hello' })).toBe(false);
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
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    expect(postConfigs).toContainEqual(
      expect.objectContaining({
        path: `${internalApiPath}/converse/callback`,
        access: 'internal',
      })
    );
  });

  it('schedules callback converse with origin for conversation resolution', async () => {
    const callbackPath = `${internalApiPath}/converse/callback`;
    let callbackHandler: ((ctx: any, req: any, res: any) => Promise<any>) | undefined;
    const validateCallbackUrl = jest.fn();
    const executeAgent = jest.fn().mockResolvedValue({
      executionId: 'execution-1',
      events$: of(),
    });
    const origin = {
      type: ConversationOriginType.Slack,
      external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
      author: {
        id: 'U123',
        full_name: 'Jane Doe',
        username: 'jane',
      },
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
        callbackDeliveryService: { validateCallbackUrl },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
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
          origin,
          callback: {
            url: 'https://relay.example.com/events?token=abc',
          },
        },
      },
      response
    );

    expect(result).toEqual({
      status: 202,
      payload: { execution_id: 'execution-1', status: ExecutionStatus.scheduled },
    });
    expect(validateCallbackUrl).toHaveBeenCalledWith('https://relay.example.com/events?token=abc');
    expect(executeAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        useTaskManager: true,
        params: expect.objectContaining({
          conversationId: undefined,
          origin,
          callback: {
            url: 'https://relay.example.com/events?token=abc',
          },
        }),
      })
    );
  });

  it('rejects callback converse when the callback URL is not allowlisted', async () => {
    const callbackPath = `${internalApiPath}/converse/callback`;
    let callbackHandler: ((ctx: any, req: any, res: any) => Promise<any>) | undefined;
    const validateCallbackUrl = jest.fn().mockImplementation(() => {
      throw new Error(
        'target url "https://disallowed.example.com/events" is not added to the Kibana config xpack.actions.allowedHosts'
      );
    });
    const executeAgent = jest.fn();

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
        callbackDeliveryService: { validateCallbackUrl },
      }),
      coreSetup: {} as never,
      pluginsSetup: {},
      logger: loggingSystemMock.createLogger(),
    } as never);

    const response = {
      accepted: jest.fn(),
      forbidden: jest.fn(),
      customError: jest.fn(({ body, statusCode }) => ({ status: statusCode, payload: body })),
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
          callback: {
            url: 'https://disallowed.example.com/events',
          },
        },
      },
      response
    );

    expect(result).toEqual({
      status: 400,
      payload: {
        attributes: {},
        message:
          'target url "https://disallowed.example.com/events" is not added to the Kibana config xpack.actions.allowedHosts',
      },
    });
    expect(executeAgent).not.toHaveBeenCalled();
  });
});
