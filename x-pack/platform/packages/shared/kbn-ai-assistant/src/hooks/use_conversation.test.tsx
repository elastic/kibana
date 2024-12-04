/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import {
  act,
  renderHook,
  type RenderHookResult,
  type WrapperComponent,
} from '@testing-library/react-hooks';
import { merge } from 'lodash';
import React, { PropsWithChildren } from 'react';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import {
  MessageRole,
  StreamingChatResponseEventType,
  StreamingChatResponseEventWithoutError,
} from '@kbn/observability-ai-assistant-plugin/common';
import { EMPTY_CONVERSATION_TITLE } from '../i18n';
import type { AIAssistantAppService } from '../service/create_app_service';
import {
  useConversation,
  type UseConversationProps,
  type UseConversationResult,
} from './use_conversation';
import { ChatState } from '@kbn/observability-ai-assistant-plugin/public';
import { createMockChatService } from '../utils/create_mock_chat_service';
import { createUseChat } from '@kbn/observability-ai-assistant-plugin/public/hooks/use_chat';
import type { NotificationsStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { AssistantScope } from '@kbn/ai-assistant-common';

let hookResult: RenderHookResult<UseConversationProps, UseConversationResult>;

type MockedService = DeeplyMockedKeys<Omit<AIAssistantAppService, 'conversations'>> & {
  conversations: DeeplyMockedKeys<
    Omit<AIAssistantAppService['conversations'], 'predefinedConversation$'>
  > & {
    predefinedConversation$: Observable<any>;
  };
};

const mockService: MockedService = {
  callApi: jest.fn(),
  isEnabled: jest.fn(),
  start: jest.fn(),
  register: jest.fn(),
  setScreenContext: jest.fn(),
  getScreenContexts: jest.fn(),
  conversations: {
    openNewConversation: jest.fn(),
    predefinedConversation$: new Observable(),
  },
  navigate: jest.fn().mockReturnValue(of()),
  scope$: new BehaviorSubject<AssistantScope[]>(['all']) as MockedService['scope$'],
  setScopes: jest.fn(),
  getScopes: jest.fn(),
};

const mockChatService = createMockChatService();

const addErrorMock = jest.fn();

const useKibanaMockServices = {
  uiSettings: {
    get: jest.fn(),
  },
  observabilityAIAssistant: {
    useChat: createUseChat({
      notifications: {
        toasts: {
          addError: addErrorMock,
        },
      } as unknown as NotificationsStart,
    }),
    service: mockService,
  },
};

describe('useConversation', () => {
  let wrapper: WrapperComponent<PropsWithChildren<UseConversationProps>>;

  beforeEach(() => {
    jest.clearAllMocks();
    wrapper = ({ children }: PropsWithChildren<unknown>) => (
      <KibanaContextProvider services={useKibanaMockServices}>{children}</KibanaContextProvider>
    );
  });

  describe('with initial messages and a conversation id', () => {
    beforeEach(() => {
      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
          initialMessages: [
            {
              '@timestamp': new Date().toISOString(),
              message: { content: '', role: MessageRole.User },
            },
          ],
          initialConversationId: 'foo',
        },
        wrapper,
      });
    });
    it('throws an error', () => {
      expect(hookResult.result.error).toBeTruthy();
    });
  });

  describe('without initial messages and a conversation id', () => {
    beforeEach(() => {
      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
        },
        wrapper,
      });
    });

    it('returns only the system message', () => {
      expect(hookResult.result.current.messages).toEqual([
        {
          '@timestamp': expect.any(String),
          message: {
            content: '',
            role: MessageRole.System,
          },
        },
      ]);
    });

    it('returns a ready state', () => {
      expect(hookResult.result.current.state).toBe(ChatState.Ready);
    });

    it('does not call the fetch api', () => {
      expect(mockService.callApi).not.toHaveBeenCalled();
    });
  });

  describe('with initial messages', () => {
    beforeEach(() => {
      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
          initialMessages: [
            {
              '@timestamp': new Date().toISOString(),
              message: {
                content: 'Test',
                role: MessageRole.User,
              },
            },
          ],
        },
        wrapper,
      });
    });

    it('returns the system message and the initial messages', () => {
      expect(hookResult.result.current.messages).toEqual([
        {
          '@timestamp': expect.any(String),
          message: {
            content: '',
            role: MessageRole.System,
          },
        },
        {
          '@timestamp': expect.any(String),
          message: {
            content: 'Test',
            role: MessageRole.User,
          },
        },
      ]);
    });
  });

  describe('with a conversation id that successfully loads', () => {
    beforeEach(async () => {
      mockService.callApi.mockResolvedValueOnce({
        conversation: {
          id: 'my-conversation-id',
        },
        messages: [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.System,
              content: 'System',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'User',
            },
          },
        ],
      });

      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
          initialConversationId: 'my-conversation-id',
        },
        wrapper,
      });

      await act(async () => {});
    });

    it('returns the loaded conversation', () => {
      expect(hookResult.result.current.conversation.value).toEqual({
        conversation: {
          id: 'my-conversation-id',
        },
        messages: [
          {
            '@timestamp': expect.any(String),
            message: {
              content: 'System',
              role: MessageRole.System,
            },
          },
          {
            '@timestamp': expect.any(String),
            message: {
              content: 'User',
              role: MessageRole.User,
            },
          },
        ],
      });
    });

    it('sets messages to the messages of the conversation', () => {
      expect(hookResult.result.current.messages).toEqual([
        {
          '@timestamp': expect.any(String),
          message: {
            content: expect.any(String),
            role: MessageRole.System,
          },
        },
        {
          '@timestamp': expect.any(String),
          message: {
            content: 'User',
            role: MessageRole.User,
          },
        },
      ]);
    });

    it('overrides the system message', () => {
      expect(hookResult.result.current.messages[0].message.content).toBe('');
    });
  });

  describe('with a conversation id that fails to load', () => {
    beforeEach(async () => {
      mockService.callApi.mockRejectedValueOnce(new Error('failed to load'));

      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
          initialConversationId: 'my-conversation-id',
        },
        wrapper,
      });

      await act(async () => {});
    });

    it('returns an error', () => {
      expect(hookResult.result.current.conversation.error).toBeTruthy();
    });

    it('resets the messages', () => {
      expect(hookResult.result.current.messages.length).toBe(1);
    });
  });

  describe('when chat completes', () => {
    const subject: Subject<StreamingChatResponseEventWithoutError> = new Subject();
    let onConversationUpdate: jest.Mock;
    const expectedMessages = [
      {
        '@timestamp': expect.any(String),
        message: {
          role: MessageRole.System,
          content: '',
        },
      },
      {
        '@timestamp': expect.any(String),
        message: {
          role: MessageRole.User,
          content: 'Hello',
        },
      },
      {
        '@timestamp': expect.any(String),
        message: {
          role: MessageRole.Assistant,
          content: 'Goodbye',
        },
      },
      {
        '@timestamp': expect.any(String),
        message: {
          role: MessageRole.User,
          content: 'Hello again',
        },
      },
      {
        '@timestamp': expect.any(String),
        message: {
          role: MessageRole.Assistant,
          content: 'Goodbye again',
        },
      },
    ];
    beforeEach(() => {
      mockService.callApi.mockImplementation(async (endpoint, request) =>
        merge(
          {
            conversation: {
              id: 'my-conversation-id',
            },
            messages: expectedMessages,
          },
          (request as any).params.body
        )
      );

      onConversationUpdate = jest.fn();

      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
          initialMessages: [
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.User,
                content: 'Hello',
              },
            },
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.Assistant,
                content: 'Goodbye',
              },
            },
          ],
          onConversationUpdate,
        },
        wrapper,
      });

      mockChatService.complete.mockImplementationOnce(() => {
        return subject;
      });
    });

    describe('and the conversation is created or updated', () => {
      beforeEach(async () => {
        await act(async () => {
          hookResult.result.current.next(
            hookResult.result.current.messages.concat({
              '@timestamp': new Date().toISOString(),
              message: {
                content: 'Hello again',
                role: MessageRole.User,
              },
            })
          );
          subject.next({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: 'my-message',
            message: {
              content: 'Goodbye',
            },
          });
          subject.next({
            type: StreamingChatResponseEventType.MessageAdd,
            id: 'my-message',
            message: {
              '@timestamp': new Date().toISOString(),
              message: {
                content: 'Goodbye',
                role: MessageRole.Assistant,
              },
            },
          });
          subject.next({
            type: StreamingChatResponseEventType.ConversationUpdate,
            conversation: {
              id: 'my-conversation-id',
              title: 'My title',
              last_updated: new Date().toISOString(),
            },
          });
          subject.complete();
        });
      });

      it('calls the onConversationUpdate hook', () => {
        expect(onConversationUpdate).toHaveBeenCalledWith({
          conversation: {
            id: 'my-conversation-id',
            last_updated: expect.any(String),
            title: 'My title',
          },
        });
      });
    });
  });

  describe('when the title is updated', () => {
    describe('without a stored conversation', () => {
      beforeEach(() => {
        hookResult = renderHook(useConversation, {
          initialProps: {
            chatService: mockChatService,
            connectorId: 'my-connector',
            initialMessages: [
              {
                '@timestamp': new Date().toISOString(),
                message: { content: '', role: MessageRole.User },
              },
            ],
            initialConversationId: 'foo',
          },
          wrapper,
        });
      });

      it('throws an error', () => {
        expect(() => hookResult.result.current.saveTitle('my-new-title')).toThrow();
      });
    });

    describe('with a stored conversation', () => {
      let resolve: (value: unknown) => void;
      beforeEach(async () => {
        mockService.callApi.mockImplementation(async (endpoint, request) => {
          if (
            endpoint === 'PUT /internal/observability_ai_assistant/conversation/{conversationId}'
          ) {
            return new Promise((_resolve) => {
              resolve = _resolve;
            });
          }
          return {
            '@timestamp': new Date().toISOString(),
            conversation: {
              id: 'my-conversation-id',
              title: EMPTY_CONVERSATION_TITLE,
            },
            labels: {},
            numeric_labels: {},
            public: false,
            messages: [],
          };
        });

        await act(async () => {
          hookResult = renderHook(useConversation, {
            initialProps: {
              chatService: mockChatService,
              connectorId: 'my-connector',
              initialConversationId: 'my-conversation-id',
            },
            wrapper,
          });
        });
      });

      it('does not throw an error', () => {
        expect(() => hookResult.result.current.saveTitle('my-new-title')).not.toThrow();
      });

      it('calls the update API', async () => {
        act(() => {
          hookResult.result.current.saveTitle('my-new-title');
        });

        expect(resolve).not.toBeUndefined();

        expect(mockService.callApi.mock.calls[1]).toEqual([
          'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
          {
            signal: null,
            params: {
              path: {
                conversationId: 'my-conversation-id',
              },
              body: {
                conversation: {
                  '@timestamp': expect.any(String),
                  conversation: {
                    title: 'my-new-title',
                    id: 'my-conversation-id',
                  },
                  labels: expect.anything(),
                  messages: expect.anything(),
                  numeric_labels: expect.anything(),
                  public: expect.anything(),
                },
              },
            },
          },
        ]);

        mockService.callApi.mockImplementation(async (endpoint, request) => {
          return {
            '@timestamp': new Date().toISOString(),
            conversation: {
              id: 'my-conversation-id',
              title: 'my-new-title',
            },
            labels: {},
            numeric_labels: {},
            public: false,
            messages: [],
          };
        });

        await act(async () => {
          resolve({
            conversation: {
              title: 'my-new-title',
            },
          });
        });

        expect(mockService.callApi.mock.calls[2]).toEqual([
          'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          {
            signal: expect.anything(),
            params: {
              path: {
                conversationId: 'my-conversation-id',
              },
            },
          },
        ]);

        expect(hookResult.result.current.conversation.value?.conversation.title).toBe(
          'my-new-title'
        );
      });
    });
  });
});
