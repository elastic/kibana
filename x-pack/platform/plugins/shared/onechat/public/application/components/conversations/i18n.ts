/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const conversationsCommonLabels = {
  header: {
    ariaLabel: i18n.translate('xpack.onechat.header.ariaLabel', {
      defaultMessage: 'Conversation header',
    }),
    sidebarToggle: {
      openAriaLabel: i18n.translate('xpack.onechat.header.sidebarToggle.openAriaLabel', {
        defaultMessage: 'Open sidebar',
      }),
      closeAriaLabel: i18n.translate('xpack.onechat.header.sidebarToggle.closeAriaLabel', {
        defaultMessage: 'Close sidebar',
      }),
    },
    conversationTitle: {
      newConversationDisplay: i18n.translate(
        'xpack.onechat.header.conversationTitle.newConversationDisplay',
        {
          defaultMessage: 'New conversation',
        }
      ),
      ariaLabel: i18n.translate('xpack.onechat.header.conversationTitle.ariaLabel', {
        defaultMessage: 'Conversation title',
      }),
    },
    actions: {
      ariaLabel: i18n.translate('xpack.onechat.header.actions.ariaLabel', {
        defaultMessage: 'Conversation actions',
      }),
      createNewConversationButton: {
        ariaLabel: i18n.translate(
          'xpack.onechat.header.actions.createNewConversationButton.ariaLabel',
          {
            defaultMessage: 'Create new conversation',
          }
        ),
        display: i18n.translate(
          'xpack.onechat.header.actions.createNewConversationButton.display',
          {
            defaultMessage: 'New',
          }
        ),
      },
    },
  },
  content: {
    ariaLabel: i18n.translate('xpack.onechat.content.ariaLabel', {
      defaultMessage: 'Conversation content',
    }),
    newConversationPrompt: {
      ariaLabel: i18n.translate('xpack.onechat.content.newConversationPrompt.ariaLabel', {
        defaultMessage: 'New conversation welcome prompt',
      }),
      title: i18n.translate('xpack.onechat.content.newConversationPrompt.title', {
        defaultMessage: 'How can I help today?',
      }),
      subtitle: i18n.translate('xpack.onechat.content.newConversationPrompt.subtitle', {
        defaultMessage:
          'Whether you’re starting something new or jumping back into an old thread, I am ready when you are 💪',
      }),
    },
    messages: {
      ariaLabel: i18n.translate('xpack.onechat.content.messages.ariaLabel', {
        defaultMessage: 'Conversation messages',
      }),
      round: {
        ariaLabel: i18n.translate('xpack.onechat.content.messages.round.ariaLabel', {
          defaultMessage: 'Conversation round',
        }),
        userMessage: i18n.translate('xpack.onechat.content.messages.round.userMessage', {
          defaultMessage: 'User message',
        }),
        assistantResponse: i18n.translate(
          'xpack.onechat.content.messages.round.assistantResponse',
          {
            defaultMessage: 'Assistant response',
          }
        ),
        steps: {
          toolCall: {
            header: i18n.translate('xpack.onechat.content.messages.round.steps.toolCall.header', {
              defaultMessage: 'Tool:',
            }),
            args: i18n.translate('xpack.onechat.content.messages.round.steps.toolCall.args', {
              defaultMessage: 'Tool call args',
            }),
            result: i18n.translate('xpack.onechat.content.messages.round.steps.toolCall.result', {
              defaultMessage: 'Tool call result',
            }),
            noResult: i18n.translate(
              'xpack.onechat.content.messages.round.steps.toolCall.noResult',
              {
                defaultMessage: 'No result available',
              }
            ),
          },
        },
      },
    },
    input: {
      ariaLabel: i18n.translate('xpack.onechat.content.input.ariaLabel', {
        defaultMessage: 'Message input form',
      }),
      submitAriaLabel: i18n.translate('xpack.onechat.content.input.submitAriaLabel', {
        defaultMessage: 'Submit',
      }),
      placeholder: i18n.translate('xpack.onechat.content.input.placeholder', {
        defaultMessage: 'Ask anything',
      }),
    },
  },
};
