/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { filter, last, lastValueFrom, map, of, throwError, toArray } from 'rxjs';
import { v4 } from 'uuid';
import {
  type Message,
  MessageRole,
  StreamingChatResponseEventType,
  type StreamingChatResponseEvent,
  ChatCompletionErrorCode,
  ChatCompletionError,
  MessageAddEvent,
  createInternalServerError,
  createConversationNotFoundError,
  StreamingChatResponseEventWithoutError,
} from '../../common';
import type { ObservabilityAIAssistantChatService } from '../types';
import { complete } from './complete';

const client = {
  chat: jest.fn(),
  complete: jest.fn(),
} as unknown as ObservabilityAIAssistantChatService;

const connectorId = 'foo';

const messages: Message[] = [
  {
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.System,
      content: 'System message',
    },
  },
  {
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.User,
      content: 'User message',
    },
  },
];

const createLlmResponse = (
  chunks: Array<{ content: string; function_call?: { name: string; arguments: string } }>
): StreamingChatResponseEventWithoutError[] => {
  const id = v4();
  const message = chunks.reduce<Message['message']>(
    (prev, current) => {
      prev.content += current.content ?? '';
      prev.function_call!.name += current.function_call?.name ?? '';
      prev.function_call!.arguments! += current.function_call?.arguments ?? '';
      return prev;
    },
    {
      content: '',
      role: MessageRole.Assistant,
      function_call: { name: '', arguments: '', trigger: MessageRole.Assistant },
    }
  );

  const events: StreamingChatResponseEventWithoutError[] = [
    ...chunks.map((msg) => ({
      id,
      message: msg,
      type: StreamingChatResponseEventType.ChatCompletionChunk as const,
    })),
    {
      id,
      message: {
        '@timestamp': new Date().toString(),
        message,
      },
      type: StreamingChatResponseEventType.MessageAdd as const,
    },
  ];

  return events;
};

type CompleteParameters = Parameters<typeof complete>[0];

describe('complete', () => {
  const requestCallback: jest.MockedFunction<Parameters<typeof complete>[1]> = jest.fn();

  beforeEach(() => {
    requestCallback.mockReset();
  });

  function callComplete(params?: Partial<CompleteParameters>) {
    return complete(
      {
        client,
        connectorId,
        getScreenContexts: () => [],
        messages,
        persist: false,
        disableFunctions: false,
        signal: new AbortController().signal,
        ...params,
        scopes: ['all'],
      },
      requestCallback
    );
  }

  describe('when an error is emitted', () => {
    beforeEach(() => {
      requestCallback.mockImplementation(() => throwError(() => createConversationNotFoundError()));
    });

    it('the observable errors out', async () => {
      await expect(async () => await lastValueFrom(callComplete())).rejects.toThrowError(
        'Conversation not found'
      );

      await expect(async () => await lastValueFrom(callComplete())).rejects.toBeInstanceOf(
        ChatCompletionError
      );

      await expect(async () => await lastValueFrom(callComplete())).rejects.toHaveProperty(
        'code',
        ChatCompletionErrorCode.NotFoundError
      );
    });
  });

  describe('with screen context and an action is called', () => {
    const respondFn: jest.MockedFn<any> = jest.fn();

    const getScreenContexts: CompleteParameters['getScreenContexts'] = jest.fn().mockReturnValue([
      {
        actions: [
          {
            name: 'my_action',
            description: 'My action',
            parameters: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                },
              },
            },
            respond: respondFn,
          },
        ],
      },
    ]);

    beforeEach(() => {
      requestCallback.mockImplementationOnce(() =>
        of(
          ...createLlmResponse([
            {
              content: '',
              function_call: { name: 'my_action', arguments: JSON.stringify({ foo: 'bar' }) },
            },
          ])
        )
      );
    });
    describe('and it succeeds', () => {
      let allMessages: Message[] = [];
      beforeEach(async () => {
        respondFn.mockResolvedValueOnce({ content: { bar: 'foo' } });

        requestCallback.mockImplementationOnce(() =>
          of(...createLlmResponse([{ content: 'Great action call' }]))
        );

        allMessages = await lastValueFrom(
          callComplete({
            getScreenContexts,
          }).pipe(
            filter(
              (event): event is MessageAddEvent =>
                event.type === StreamingChatResponseEventType.MessageAdd
            ),
            map((event) => event.message),
            toArray(),
            last()
          )
        );
      });

      it('calls the request callback again with the executed message', () => {
        expect(requestCallback).toHaveBeenCalledTimes(2);

        const nextMessages = requestCallback.mock.lastCall![0].params.body.messages;

        const expectedMessages = [
          {
            '@timestamp': expect.any(String),
            message: {
              content: '',
              function_call: {
                arguments: JSON.stringify({ foo: 'bar' }),
                name: 'my_action',
                trigger: MessageRole.Assistant,
              },
              role: MessageRole.Assistant,
            },
          },
          {
            '@timestamp': expect.any(String),
            message: {
              content: JSON.stringify({ bar: 'foo' }),
              name: 'my_action',
              role: MessageRole.User,
            },
          },
        ];

        expect(nextMessages).toEqual([...messages, ...expectedMessages]);
      });

      it('calls the action handler with the arguments from the LLM', () => {
        expect(respondFn).toHaveBeenCalledWith(
          expect.objectContaining({
            args: {
              foo: 'bar',
            },
          })
        );
      });

      it('returns all the messages in the created observable', () => {
        expect(allMessages[allMessages.length - 1]).toEqual({
          '@timestamp': expect.any(String),
          message: {
            content: 'Great action call',
            function_call: {
              arguments: '',
              name: '',
              trigger: MessageRole.Assistant,
            },
            role: MessageRole.Assistant,
          },
        });
      });
    });

    describe('and it fails', () => {
      beforeEach(async () => {
        respondFn.mockRejectedValueOnce(new Error('foo'));

        requestCallback.mockImplementationOnce(() =>
          of(...createLlmResponse([{ content: 'Action call failed' }]))
        );

        await lastValueFrom(
          callComplete({
            getScreenContexts,
          }).pipe(
            filter(
              (event): event is MessageAddEvent =>
                event.type === StreamingChatResponseEventType.MessageAdd
            ),
            map((event) => event.message),
            toArray(),
            last()
          )
        );
      });

      it('calls the request callback again with the error', () => {
        expect(requestCallback).toHaveBeenCalledTimes(2);

        const nextMessages = requestCallback.mock.lastCall![0].params.body.messages;

        const errorMessage = nextMessages[nextMessages.length - 1];

        expect(errorMessage).toEqual({
          '@timestamp': expect.any(String),
          message: {
            content: expect.any(String),
            data: expect.any(String),
            name: 'my_action',
            role: MessageRole.User,
          },
        });

        expect(JSON.parse(errorMessage.message.content ?? '{}')).toEqual({
          error: expect.objectContaining({
            message: 'foo',
          }),
          message: 'foo',
        });
      });
    });

    describe('and it returns an observable that completes', () => {
      let allMessages: Message[] = [];
      let allEvents: StreamingChatResponseEvent[] = [];
      beforeEach(async () => {
        respondFn.mockResolvedValueOnce(
          of(...createLlmResponse([{ content: 'My function response' }]))
        );

        allEvents = await lastValueFrom(
          callComplete({
            getScreenContexts,
          }).pipe(toArray(), last())
        );

        allMessages = allEvents
          .filter(
            (event): event is MessageAddEvent =>
              event.type === StreamingChatResponseEventType.MessageAdd
          )
          .map((event) => event.message);
      });

      it('propagates all the events from the responded observable', () => {
        expect(allEvents.length).toEqual(5);
        expect(
          allEvents.filter(
            (event) => event.type === StreamingChatResponseEventType.ChatCompletionChunk
          ).length
        ).toEqual(2);
      });

      it('automatically adds a function response message', () => {
        expect(allMessages[allMessages.length - 2]).toEqual({
          '@timestamp': expect.any(String),
          message: {
            content: JSON.stringify({ executed: true }),
            name: 'my_action',
            role: MessageRole.User,
          },
        });
      });

      it('adds the messages from the observable', () => {
        expect(allMessages[allMessages.length - 1]).toEqual({
          '@timestamp': expect.any(String),
          message: {
            content: 'My function response',
            function_call: {
              name: '',
              arguments: '',
              trigger: MessageRole.Assistant,
            },
            role: MessageRole.Assistant,
          },
        });
      });
    });

    describe('and it returns an observable that errors out', () => {
      let allMessages: Message[] = [];
      let allEvents: StreamingChatResponseEvent[] = [];
      beforeEach(async () => {
        respondFn.mockResolvedValueOnce(throwError(() => createInternalServerError('Foo')));

        requestCallback.mockImplementationOnce(() =>
          of(
            ...createLlmResponse([
              {
                content: 'Looks like your action failed',
              },
            ])
          )
        );

        allEvents = await lastValueFrom(
          callComplete({
            getScreenContexts,
          }).pipe(toArray(), last())
        );

        allMessages = allEvents
          .filter(
            (event): event is MessageAddEvent =>
              event.type === StreamingChatResponseEventType.MessageAdd
          )
          .map((event) => event.message);
      });

      it('appends the error message', () => {
        expect(allMessages[allMessages.length - 1]).toEqual({
          '@timestamp': expect.any(String),
          message: {
            content: 'Looks like your action failed',
            function_call: {
              arguments: '',
              name: '',
              trigger: MessageRole.Assistant,
            },
            role: MessageRole.Assistant,
          },
        });
      });
    });
  });
});
