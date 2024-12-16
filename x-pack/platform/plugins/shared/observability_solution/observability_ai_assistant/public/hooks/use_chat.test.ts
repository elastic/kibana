/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { renderHook, act, type RenderHookResult } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  MessageRole,
  type ObservabilityAIAssistantChatService,
  type ObservabilityAIAssistantService,
} from '..';
import {
  createInternalServerError,
  FunctionDefinition,
  StreamingChatResponseEventType,
  type StreamingChatResponseEventWithoutError,
} from '../../common';
import { ChatState, useChat, type UseChatProps, type UseChatResult } from './use_chat';
import * as useKibanaModule from './use_kibana';

type MockedChatService = DeeplyMockedKeys<ObservabilityAIAssistantChatService>;

const mockChatService: MockedChatService = {
  chat: jest.fn(),
  complete: jest.fn(),
  sendAnalyticsEvent: jest.fn(),
  functions$: new BehaviorSubject<FunctionDefinition[]>([]) as MockedChatService['functions$'],
  getFunctions: jest.fn().mockReturnValue([]),
  hasFunction: jest.fn().mockReturnValue(false),
  hasRenderFunction: jest.fn().mockReturnValue(true),
  renderFunction: jest.fn(),
  getSystemMessage: jest.fn().mockReturnValue({
    '@timestamp': new Date().toISOString(),
    message: {
      content: 'system',
      role: MessageRole.System,
    },
  }),
  getScopes: jest.fn(),
};

const addErrorMock = jest.fn();

jest.spyOn(useKibanaModule, 'useKibana').mockReturnValue({
  services: {
    uiSettings: {
      get: jest.fn(),
    },
    notifications: {
      toasts: {
        addError: addErrorMock,
      },
    },
  },
} as any);

let hookResult: RenderHookResult<UseChatResult, UseChatProps>;

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initially', () => {
    beforeEach(() => {
      hookResult = renderHook(useChat, {
        initialProps: {
          connectorId: 'my-connector',
          chatService: mockChatService,
          initialMessages: [
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.User,
                content: 'hello',
              },
            },
          ],
          persist: false,
          service: {
            getScreenContexts: () => [],
          } as unknown as ObservabilityAIAssistantService,
          scopes: ['observability'],
        } as UseChatProps,
      });
    });

    it('returns the initial messages including the system message', () => {
      const { messages } = hookResult.result.current;
      expect(messages.length).toBe(2);
      expect(messages[0].message.role).toBe('system');
      expect(messages[1].message.content).toBe('hello');
    });

    it('sets chatState to ready', () => {
      expect(hookResult.result.current.state).toBe(ChatState.Ready);
    });
  });

  describe('when calling next()', () => {
    let subject: Subject<StreamingChatResponseEventWithoutError>;

    beforeEach(() => {
      hookResult = renderHook(useChat, {
        initialProps: {
          connectorId: 'my-connector',
          chatService: mockChatService,
          initialMessages: [],
          persist: false,
          service: {
            getScreenContexts: () => [],
          } as unknown as ObservabilityAIAssistantService,
          scopes: ['observability'],
        } as UseChatProps,
      });

      subject = new Subject();

      mockChatService.complete.mockReturnValueOnce(subject);

      act(() => {
        hookResult.result.current.next([
          ...hookResult.result.current.messages,
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'hello',
            },
          },
        ]);
      });
    });

    it('sets the chatState to loading', () => {
      expect(hookResult.result.current.state).toBe(ChatState.Loading);
    });

    describe('after asking for another response', () => {
      beforeEach(() => {
        act(() => {
          hookResult.result.current.next([]);
          subject.next({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: 'my-message-id',
            message: {
              content: 'goodbye',
            },
          });
          subject.next({
            type: StreamingChatResponseEventType.MessageAdd,
            id: 'my-message-id',
            message: {
              '@timestamp': new Date().toISOString(),
              message: {
                content: 'goodbye',
                role: MessageRole.Assistant,
              },
            },
          });
          subject.complete();
        });
      });

      it('shows an empty list of messages', () => {
        expect(hookResult.result.current.messages.length).toBe(1);
        expect(hookResult.result.current.messages[0].message.role).toBe(MessageRole.System);
      });

      it('aborts the running request', () => {
        expect(subject.observed).toBe(false);
      });
    });

    describe('after a partial response', () => {
      it('updates the returned messages', () => {
        act(() => {
          subject.next({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: 'my-message-id',
            message: {
              content: 'good',
            },
          });
        });

        expect(hookResult.result.current.messages[2].message.content).toBe('good');
      });
    });

    describe('after a completed response', () => {
      it('updates the returned messages and the loading state', () => {
        act(() => {
          subject.next({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: 'my-message-id',
            message: {
              content: 'good',
            },
          });
          subject.next({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: 'my-message-id',
            message: {
              content: 'bye',
            },
          });
          subject.next({
            type: StreamingChatResponseEventType.MessageAdd,
            id: 'my-message-id',
            message: {
              '@timestamp': new Date().toISOString(),
              message: {
                content: 'goodbye',
                role: MessageRole.Assistant,
              },
            },
          });
          subject.complete();
        });

        expect(hookResult.result.current.messages[2].message.content).toBe('goodbye');
        expect(hookResult.result.current.state).toBe(ChatState.Ready);
      });
    });

    describe('after aborting a response', () => {
      beforeEach(() => {
        act(() => {
          subject.next({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: 'my-message-id',
            message: {
              content: 'good',
            },
          });
          hookResult.result.current.stop();
        });
      });

      it('shows the partial message and sets chatState to aborted', () => {
        expect(hookResult.result.current.messages[2].message.content).toBe('good');
        expect(hookResult.result.current.state).toBe(ChatState.Aborted);
      });

      it('does not show an error toast', () => {
        expect(addErrorMock).not.toHaveBeenCalled();
      });
    });

    describe('after unmounting the component', () => {
      beforeEach(() => {
        act(() => {
          subject.next({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: 'my-message-id',
            message: {
              content: 'good',
            },
          });
          hookResult.unmount();
        });
      });

      it('shows the partial message and sets chatState to aborted', () => {
        expect(mockChatService.complete.mock.lastCall?.[0].signal.aborted).toBe(true);
      });
    });

    describe('after a response errors out', () => {
      beforeEach(() => {
        act(() => {
          subject.next({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: 'my-message-id',
            message: {
              content: 'good',
            },
          });
          subject.error(createInternalServerError('Internal error'));
        });
      });

      it('shows the partial message and sets chatState to error', () => {
        expect(hookResult.result.current.messages[2].message.content).toBe('good');
        expect(hookResult.result.current.state).toBe(ChatState.Error);
      });

      it('shows an error toast', () => {
        expect(addErrorMock).toHaveBeenCalled();
      });
    });
  });
});
