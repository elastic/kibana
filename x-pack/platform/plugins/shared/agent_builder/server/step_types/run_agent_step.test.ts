/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { of, throwError } from 'rxjs';
import { ChatEventType, createRequestAbortedError } from '@kbn/agent-builder-common';
import { getRunAgentStepDefinition } from './run_agent_step';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

describe('ai.agent workflow step (Agent Builder)', () => {
  const createContext = (overrides: Partial<any> = {}) => {
    const fakeRequest = { headers: {} } as unknown as KibanaRequest;
    return {
      input: {},
      config: {},
      rawInput: {},
      contextManager: {
        getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
        getContext: jest.fn(),
        getScopedEsClient: jest.fn(),
        renderInputTemplate: jest.fn(),
      },
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      abortSignal: new AbortController().signal,
      stepId: 'test-step',
      stepType: 'ai.agent',
      ...overrides,
    } as StepHandlerContext;
  };

  it('creates and persists a conversation when create_conversation is true, and emits conversation_id', async () => {
    const chat = {
      converse: jest.fn().mockReturnValue(
        of(
          {
            type: ChatEventType.conversationCreated,
            data: { conversation_id: 'c-1', title: 't' },
          },
          {
            type: ChatEventType.roundComplete,
            data: {
              round: {
                id: 'r-1',
                response: { message: 'ok', structured_output: { foo: 'bar' } },
              },
            },
          }
        )
      ),
    };

    const runner = { runAgent: jest.fn() };

    const serviceManager = {
      internalStart: {
        runnerFactory: { getRunner: () => runner },
        chat,
      },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const context = createContext({
      input: {
        message: 'hello',
      },
      config: {
        'create-conversation': true,
      },
    });
    const res = await step.handler(context);

    expect(chat.converse).toHaveBeenCalledTimes(1);
    expect(runner.runAgent).not.toHaveBeenCalled();
    expect(res).toHaveProperty('output.conversation_id');
    expect(res.output?.conversation_id).toBe('c-1');
  });

  it('uses conversation_id from input (with:) and create-conversation from config (static)', async () => {
    const chat = {
      converse: jest.fn().mockReturnValue(
        of(
          {
            type: ChatEventType.conversationCreated,
            data: { conversation_id: 'c-dash', title: 't' },
          },
          {
            type: ChatEventType.roundComplete,
            data: {
              round: {
                id: 'r-1',
                response: { message: 'ok' },
              },
            },
          }
        )
      ),
    };
    const runner = { runAgent: jest.fn() };

    const serviceManager = {
      internalStart: {
        runnerFactory: { getRunner: () => runner },
        chat,
      },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
          conversation_id: 'c-dash',
        },
        config: {
          'create-conversation': true,
        },
      })
    );

    expect(chat.converse).toHaveBeenCalledTimes(1);
    expect(runner.runAgent).not.toHaveBeenCalled();
    expect(res).toHaveProperty('output.conversation_id', 'c-dash');
  });

  it('reuses an existing conversation_id and updates it for follow-up prompts', async () => {
    const chat = {
      converse: jest.fn().mockReturnValue(
        of(
          {
            type: ChatEventType.conversationUpdated,
            data: { conversation_id: 'c-1', title: 't' },
          },
          {
            type: ChatEventType.roundComplete,
            data: {
              round: {
                id: 'r-1',
                response: { message: 'ok' },
              },
            },
          }
        )
      ),
    };
    const runner = { runAgent: jest.fn() };

    const serviceManager = {
      internalStart: {
        runnerFactory: { getRunner: () => runner },
        chat,
      },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'follow up',
          conversation_id: 'c-1',
        },
      })
    );

    expect(chat.converse).toHaveBeenCalledTimes(1);
    expect(runner.runAgent).not.toHaveBeenCalled();
    expect(res.output?.conversation_id).toBe('c-1');
  });

  it('does not create a conversation when create_conversation is false and no conversation_id is provided', async () => {
    const runner = { runAgent: jest.fn() };

    const serviceManager = {
      internalStart: {
        runnerFactory: { getRunner: () => runner },
        chat: {
          converse: jest.fn().mockReturnValue(
            of({
              type: ChatEventType.roundComplete,
              data: {
                round: {
                  id: 'r-1',
                  response: { message: 'ok' },
                },
              },
            })
          ),
        },
      },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'stateless',
        },
      })
    );

    expect(serviceManager.internalStart.chat.converse).toHaveBeenCalledTimes(1);
    expect(res.output?.conversation_id).toBeUndefined();
    expect(runner.runAgent).not.toHaveBeenCalled();
  });

  it('propagates chat service errors (e.g., missing connector)', async () => {
    const chatError = new Error('No LLM connector configured');
    const chat = {
      converse: jest.fn().mockReturnValue(throwError(() => chatError)),
    };
    const runner = { runAgent: jest.fn() };

    const serviceManager = {
      internalStart: {
        runnerFactory: { getRunner: () => runner },
        chat,
      },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
        },
      })
    );

    expect(chat.converse).toHaveBeenCalledTimes(1);
    expect(res.error).toBe(chatError);
  });

  it('returns an error when no round_complete event is emitted', async () => {
    const chat = {
      converse: jest.fn().mockReturnValue(
        of({
          type: ChatEventType.conversationCreated,
          data: { conversation_id: 'c-1', title: 't' },
        })
      ),
    };
    const runner = { runAgent: jest.fn() };

    const serviceManager = {
      internalStart: {
        runnerFactory: { getRunner: () => runner },
        chat,
      },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
        },
      })
    );

    expect(chat.converse).toHaveBeenCalledTimes(1);
    expect(res.error).toBeInstanceOf(Error);
    expect(res.error?.message).toContain('No round_complete event');
  });

  it('fails when the workflow abort signal is already aborted', async () => {
    const chat = {
      converse: jest
        .fn()
        .mockReturnValue(
          throwError(() => createRequestAbortedError('Converse request was aborted'))
        ),
    };
    const runner = { runAgent: jest.fn() };
    const abortController = new AbortController();
    abortController.abort();

    const serviceManager = {
      internalStart: {
        runnerFactory: { getRunner: () => runner },
        chat,
      },
    } as any;

    const step = getRunAgentStepDefinition(serviceManager);
    const res = await step.handler(
      createContext({
        input: {
          message: 'hello',
        },
        abortSignal: abortController.signal,
      })
    );

    expect(chat.converse).toHaveBeenCalledTimes(1);
    expect(res.error).toBeInstanceOf(Error);
    expect(res.error?.message).toContain('aborted');
  });
});
