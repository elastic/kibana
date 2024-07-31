/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiBasicTableColumn, EuiIcon, EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedDate } from '@kbn/i18n-react';

import { PromptResponse } from '@kbn/elastic-assistant-common';
import { Conversation } from '../../../../assistant_context/types';
import { AIConnector } from '../../../../connectorland/connector_selector';
import { BadgesColumn } from '../../../common/components/assistant_settings_management/badges';
import { useInlineActions } from '../../../common/components/assistant_settings_management/inline_actions';
import { getConversationApiConfig } from '../../../use_conversation/helpers';
import { SYSTEM_PROMPT_DEFAULT_NEW_CONVERSATION } from '../system_prompt_modal/translations';
import * as i18n from './translations';
import { getSelectedConversations } from './utils';

type SystemPromptTableItem = PromptResponse & { defaultConversations: string[] };

export const useSystemPromptTable = () => {
  const getActions = useInlineActions<SystemPromptTableItem>();
  const getColumns = useCallback(
    ({
      isActionsDisabled,
      onEditActionClicked,
      onDeleteActionClicked,
    }: {
      isActionsDisabled: boolean;
      onEditActionClicked: (prompt: SystemPromptTableItem) => void;
      onDeleteActionClicked: (prompt: SystemPromptTableItem) => void;
    }): Array<EuiBasicTableColumn<SystemPromptTableItem>> => [
      {
        align: 'left',
        name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_NAME,
        truncateText: { lines: 3 },
        render: (prompt: SystemPromptTableItem) =>
          prompt?.name ? (
            <EuiLink onClick={() => onEditActionClicked(prompt)} disabled={isActionsDisabled}>
              {prompt?.name}
              {prompt.isNewConversationDefault && (
                <EuiIcon
                  type="starFilled"
                  aria-label={SYSTEM_PROMPT_DEFAULT_NEW_CONVERSATION}
                  className="eui-alignTop"
                />
              )}
            </EuiLink>
          ) : null,
        sortable: ({ name }: SystemPromptTableItem) => name,
      },
      {
        align: 'left',
        name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_DEFAULT_CONVERSATIONS,
        render: ({ defaultConversations, id }: SystemPromptTableItem) => (
          <BadgesColumn items={defaultConversations} prefix={id} />
        ),
      },
      {
        align: 'left',
        field: 'updatedAt',
        name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_DATE_UPDATED,
        render: (updatedAt: SystemPromptTableItem['updatedAt']) =>
          updatedAt ? (
            <EuiBadge color="hollow">
              <FormattedDate
                value={new Date(updatedAt)}
                year="numeric"
                month="2-digit"
                day="numeric"
              />
            </EuiBadge>
          ) : null,
        sortable: true,
      },
      {
        align: 'center',
        width: '120px',
        ...getActions({
          onDelete: onDeleteActionClicked,
          onEdit: onEditActionClicked,
        }),
      },
    ],
    [getActions]
  );

  const getSystemPromptsList = ({
    connectors,
    conversationSettings,
    defaultConnector,
    systemPromptSettings,
  }: {
    connectors: AIConnector[] | undefined;
    conversationSettings: Record<string, Conversation>;
    defaultConnector: AIConnector | undefined;
    systemPromptSettings: PromptResponse[];
  }): SystemPromptTableItem[] => {
    const conversationsWithApiConfig = Object.entries(conversationSettings).reduce<
      Record<string, Conversation>
    >((acc, [key, conversation]) => {
      acc[key] = {
        ...conversation,
        ...getConversationApiConfig({
          allSystemPrompts: systemPromptSettings,
          connectors,
          conversation,
          defaultConnector,
        }),
      };

      return acc;
    }, {});
    return systemPromptSettings.map((systemPrompt) => {
      const defaultConversations = getSelectedConversations(
        conversationsWithApiConfig,
        systemPrompt?.id
      ).map(({ title }) => title);

      return {
        ...systemPrompt,
        defaultConversations,
      };
    });
  };

  return { getColumns, getSystemPromptsList };
};
