/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { merge, omit } from 'lodash';
import { useState } from 'react';
import type {
  Conversation,
  ConversationCreateRequest,
  Message,
} from '@kbn/observability-ai-assistant-plugin/common';
import type { ObservabilityAIAssistantChatService } from '@kbn/observability-ai-assistant-plugin/public';
import type { AbortableAsyncState } from '@kbn/observability-ai-assistant-plugin/public';
import type { UseChatResult } from '@kbn/observability-ai-assistant-plugin/public';
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import { ConversationAccess } from '@kbn/observability-ai-assistant-plugin/public';
import { EMPTY_CONVERSATION_TITLE } from '../i18n';
import { useAIAssistantAppService } from './use_ai_assistant_app_service';
import { useKibana } from './use_kibana';
import { useOnce } from './use_once';
import { useAbortableAsync } from './use_abortable_async';
import { useScopes } from './use_scopes';

function createNewConversation({
  title = EMPTY_CONVERSATION_TITLE,
}: { title?: string } = {}): ConversationCreateRequest {
  return {
    '@timestamp': new Date().toISOString(),
    messages: [],
    conversation: {
      title,
    },
    labels: {},
    numeric_labels: {},
    public: false,
  };
}

export interface UseConversationProps {
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username' | 'profile_uid'>;
  initialConversationId?: string;
  initialMessages?: Message[];
  initialTitle?: string;
  chatService: ObservabilityAIAssistantChatService;
  connectorId: string | undefined;
  onConversationUpdate?: (conversation: { conversation: Conversation['conversation'] }) => void;
}

export type UseConversationResult = {
  conversation: AbortableAsyncState<ConversationCreateRequest | Conversation | undefined>;
  conversationId?: string;
  user?: Pick<AuthenticatedUser, 'username' | 'profile_uid'>;
  isConversationOwnedByCurrentUser: boolean;
  saveTitle: (newTitle: string) => void;
  updateConversationAccess: (access: ConversationAccess) => Promise<Conversation>;
} & Omit<UseChatResult, 'setMessages'>;

const DEFAULT_INITIAL_MESSAGES: Message[] = [];

export function useConversation({
  currentUser,
  initialConversationId: initialConversationIdFromProps,
  initialMessages: initialMessagesFromProps = DEFAULT_INITIAL_MESSAGES,
  initialTitle: initialTitleFromProps,
  chatService,
  connectorId,
  onConversationUpdate,
}: UseConversationProps): UseConversationResult {
  const service = useAIAssistantAppService();
  const scopes = useScopes();

  const {
    services: {
      notifications,
      observabilityAIAssistant: { useChat },
    },
  } = useKibana();

  const initialConversationId = useOnce(initialConversationIdFromProps);
  const initialMessages = useOnce(initialMessagesFromProps);
  const initialTitle = useOnce(initialTitleFromProps);

  const [displayedConversationId, setDisplayedConversationId] = useState(initialConversationId);

  if (initialMessages.length && initialConversationId) {
    throw new Error('Cannot set initialMessages if initialConversationId is set');
  }

  const update = (nextConversationObject: Conversation) => {
    return service
      .callApi(`PUT /internal/observability_ai_assistant/conversation/{conversationId}`, {
        signal: null,
        params: {
          path: {
            conversationId: nextConversationObject.conversation.id,
          },
          body: {
            conversation: merge(
              {
                '@timestamp': nextConversationObject['@timestamp'],
                conversation: {
                  id: nextConversationObject.conversation.id,
                },
              },
              omit(nextConversationObject, 'conversation.last_updated', 'namespace', 'user')
            ),
          },
        },
      })
      .catch((err) => {
        notifications!.toasts.addError(err, {
          title: i18n.translate('xpack.aiAssistant.errorUpdatingConversation', {
            defaultMessage: 'Could not update conversation',
          }),
        });
        throw err;
      });
  };

  const updateConversationAccess = async (access: ConversationAccess) => {
    if (!displayedConversationId || !conversation.value) {
      throw new Error('Cannot share the conversation if conversation is not stored');
    }

    try {
      const sharedConversation = await service.callApi(
        `PUT /internal/observability_ai_assistant/conversation/{conversationId}/access`,
        {
          signal: null,
          params: {
            path: {
              conversationId: displayedConversationId,
            },
            body: {
              access,
            },
          },
        }
      );

      notifications!.toasts.addSuccess({
        title: i18n.translate('xpack.aiAssistant.updateConversationAccessSuccessToast', {
          defaultMessage: 'Conversation access successfully updated to {access}',
          values: { access },
        }),
      });

      return sharedConversation;
    } catch (err) {
      notifications!.toasts.addError(err, {
        title: i18n.translate('xpack.aiAssistant.updateConversationAccessErrorToast', {
          defaultMessage: 'Could not share conversation',
        }),
      });
      throw err;
    }
  };

  const { next, messages, setMessages, state, stop } = useChat({
    initialMessages,
    initialConversationId,
    chatService,
    service,
    connectorId,
    onConversationUpdate: (event) => {
      conversation.refresh();
      setDisplayedConversationId(event.conversation.id);
      onConversationUpdate?.({ conversation: event.conversation });
    },
    persist: true,
    scopes,
  });

  const conversation: AbortableAsyncState<ConversationCreateRequest | Conversation | undefined> =
    useAbortableAsync(
      ({ signal }) => {
        if (!displayedConversationId) {
          const nextConversation = createNewConversation({ title: initialTitle });
          return nextConversation;
        }

        return service
          .callApi('GET /internal/observability_ai_assistant/conversation/{conversationId}', {
            signal,
            params: { path: { conversationId: displayedConversationId } },
          })
          .then((nextConversation) => {
            setMessages(nextConversation.messages);
            return nextConversation;
          })
          .catch((error) => {
            setMessages([]);
            throw error;
          });
      },
      [displayedConversationId, initialTitle, service, setMessages],
      {
        defaultValue: () => {
          if (!displayedConversationId) {
            const nextConversation = createNewConversation({ title: initialTitle });
            return nextConversation;
          }
          return undefined;
        },
      }
    );

  const isConversationOwnedByUser = (conversationUser: Conversation['user']): boolean => {
    if (!initialConversationId) return true;

    if (!conversationUser || !currentUser) return false;

    return conversationUser.id && currentUser.profile_uid
      ? conversationUser.id === currentUser.profile_uid
      : conversationUser.name === currentUser.username;
  };

  return {
    conversation,
    conversationId:
      conversation.value?.conversation && 'id' in conversation.value.conversation
        ? conversation.value.conversation.id
        : undefined,
    isConversationOwnedByCurrentUser: isConversationOwnedByUser(
      conversation.value && 'user' in conversation.value ? conversation.value.user : undefined
    ),
    user:
      initialConversationId && conversation.value?.conversation && 'user' in conversation.value
        ? {
            profile_uid: conversation.value.user?.id,
            username: conversation.value.user?.name || '',
          }
        : undefined,
    state,
    next,
    stop,
    messages,
    saveTitle: (title: string) => {
      if (!displayedConversationId || !conversation.value) {
        throw new Error('Cannot save title if conversation is not stored');
      }
      const nextConversation = merge({}, conversation.value as Conversation, {
        conversation: { title },
      });
      return update(nextConversation)
        .then(() => {
          return conversation.refresh();
        })
        .then(() => {
          onConversationUpdate?.(nextConversation);
        });
    },
    updateConversationAccess,
  };
}
