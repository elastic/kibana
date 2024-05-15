/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { v4 } from 'uuid';
import { isEmpty, last, omitBy } from 'lodash';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { Message } from '@kbn/observability-ai-assistant-plugin/common';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import {
  ChatState,
  ObservabilityAIAssistantChatService,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { ChatActionClickPayload } from '@kbn/observability-ai-assistant-plugin/public';
import type { ChatTimelineItem } from '../components/chat/chat_timeline';
import { RenderFunction } from '../components/render_function';
import { safeJsonParse } from './safe_json_parse';

function convertMessageToMarkdownCodeBlock(message: Message['message']) {
  let value: object;

  if (!message.name) {
    const name = message.function_call?.name;
    const args = message.function_call?.arguments
      ? safeJsonParse(message.function_call.arguments)
      : undefined;

    value = {
      name,
      args,
    };
  } else {
    const content =
      message.role !== MessageRole.Assistant && message.content
        ? safeJsonParse(message.content)
        : message.content;
    const data = message.data ? safeJsonParse(message.data) : undefined;
    value = omitBy(
      {
        content,
        data,
      },
      isEmpty
    );
  }

  return `\`\`\`\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function FunctionName({ name: functionName }: { name: string }) {
  const { euiTheme } = useEuiTheme();

  return <span style={{ fontFamily: euiTheme.font.familyCode, fontSize: 13 }}>{functionName}</span>;
}

export function getTimelineItemsfromConversation({
  chatService,
  currentUser,
  hasConnector,
  messages,
  chatState,
  onActionClick,
}: {
  chatService: ObservabilityAIAssistantChatService;
  currentUser?: Pick<AuthenticatedUser, 'username' | 'full_name'>;
  hasConnector: boolean;
  messages: Message[];
  chatState: ChatState;
  onActionClick: ({
    message,
    payload,
  }: {
    message: Message;
    payload: ChatActionClickPayload;
  }) => void;
}): ChatTimelineItem[] {
  const messagesWithoutSystem = messages.filter(
    (message) => message.message.role !== MessageRole.System
  );

  const items: ChatTimelineItem[] = [
    {
      id: v4(),
      actions: { canCopy: false, canEdit: false, canGiveFeedback: false, canRegenerate: false },
      display: { collapsed: false, hide: false },
      currentUser,
      loading: false,
      message: {
        '@timestamp': new Date().toISOString(),
        message: { role: MessageRole.User },
      },
      title: i18n.translate('xpack.observabilityAiAssistant.conversationStartTitle', {
        defaultMessage: 'started a conversation',
      }),
      role: MessageRole.User,
    },
    ...messagesWithoutSystem.map((message, index) => {
      const id = v4();

      let title: React.ReactNode = '';
      let content: string | undefined;
      let element: React.ReactNode | undefined;

      const prevFunctionCall =
        message.message.name &&
        messagesWithoutSystem[index - 1] &&
        messagesWithoutSystem[index - 1].message.function_call
          ? messagesWithoutSystem[index - 1].message.function_call
          : undefined;

      let role = message.message.function_call?.trigger || message.message.role;

      const actions = {
        canCopy: false,
        canEdit: false,
        canGiveFeedback: false,
        canRegenerate: false,
      };

      const display = {
        collapsed: false,
        hide: false,
      };

      switch (role) {
        case MessageRole.User:
          actions.canCopy = true;
          actions.canGiveFeedback = false;
          actions.canRegenerate = false;

          display.hide = false;

          // User executed a function:
          if (message.message.name && prevFunctionCall) {
            let isError = false;
            try {
              const parsedContent = JSON.parse(message.message.content ?? 'null');
              isError =
                parsedContent && typeof parsedContent === 'object' && 'error' in parsedContent;
            } catch (error) {
              isError = true;
            }

            title = !isError ? (
              <FormattedMessage
                id="xpack.observabilityAiAssistant.userExecutedFunctionEvent"
                defaultMessage="executed the function {functionName}"
                values={{
                  functionName: <FunctionName name={message.message.name} />,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.observabilityAiAssistant.executedFunctionFailureEvent"
                defaultMessage="failed to execute the function {functionName}"
                values={{
                  functionName: <FunctionName name={message.message.name} />,
                }}
              />
            );

            element =
              !isError && chatService.hasRenderFunction(message.message.name) ? (
                <RenderFunction
                  name={message.message.name}
                  arguments={prevFunctionCall?.arguments}
                  response={message.message}
                  onActionClick={(payload) => {
                    onActionClick({ message, payload });
                  }}
                />
              ) : undefined;

            content = !element ? convertMessageToMarkdownCodeBlock(message.message) : undefined;

            if (prevFunctionCall?.trigger === MessageRole.Assistant) {
              role = MessageRole.Assistant;
            }

            actions.canEdit = false;
            display.collapsed = !element;
          } else if (message.message.function_call) {
            // User suggested a function
            title = (
              <FormattedMessage
                id="xpack.observabilityAiAssistant.userSuggestedFunctionEvent"
                defaultMessage="requested the function {functionName}"
                values={{
                  functionName: <FunctionName name={message.message.function_call.name} />,
                }}
              />
            );

            content = convertMessageToMarkdownCodeBlock(message.message);

            actions.canEdit = hasConnector;
            display.collapsed = true;
          } else {
            // is a prompt by the user
            title = '';
            content = message.message.content;

            actions.canEdit = hasConnector;
            display.collapsed = false;
          }

          break;

        case MessageRole.Assistant:
          actions.canRegenerate = hasConnector;
          actions.canCopy = true;
          actions.canGiveFeedback = true;
          display.hide = false;

          // is a function suggestion by the assistant
          if (message.message.function_call?.name) {
            title = (
              <FormattedMessage
                id="xpack.observabilityAiAssistant.suggestedFunctionEvent"
                defaultMessage="requested the function {functionName}"
                values={{
                  functionName: <FunctionName name={message.message.function_call.name} />,
                }}
              />
            );
            if (message.message.content) {
              // TODO: we want to show the content always, and hide
              // the function request initially, but we don't have a
              // way to do that yet, so we hide the request here until
              // we have a fix.
              // element = message.message.content;
              content = message.message.content;
              display.collapsed = false;
            } else {
              content = convertMessageToMarkdownCodeBlock(message.message);
              display.collapsed = true;
            }

            actions.canEdit = true;
          } else {
            // is an assistant response
            title = '';
            content = message.message.content;
            display.collapsed = false;
            actions.canEdit = false;
          }
          break;
      }

      return {
        id,
        role,
        title,
        content,
        element,
        actions,
        display,
        currentUser,
        function_call: message.message.function_call,
        loading: false,
        message,
      };
    }),
  ];

  const isLoading = chatState === ChatState.Loading;

  let lastMessage = last(items);

  const isNaturalLanguageOnlyAnswerFromAssistant =
    lastMessage?.message.message.role === MessageRole.Assistant &&
    !lastMessage.message.message.function_call?.name;

  const addLoadingPlaceholder = isLoading && !isNaturalLanguageOnlyAnswerFromAssistant;

  if (addLoadingPlaceholder) {
    items.push({
      id: v4(),
      actions: {
        canCopy: false,
        canEdit: false,
        canGiveFeedback: false,
        canRegenerate: false,
      },
      display: {
        collapsed: false,
        hide: false,
      },
      content: '',
      currentUser,
      loading: chatState === ChatState.Loading,
      role: MessageRole.Assistant,
      title: '',
      message: {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.Assistant,
          content: '',
        },
      },
    });
    lastMessage = last(items);
  }

  if (isLoading && lastMessage) {
    lastMessage.loading = isLoading;
  }

  return items;
}
