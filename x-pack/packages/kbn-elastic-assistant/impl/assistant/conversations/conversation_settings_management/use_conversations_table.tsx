/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiBadge, EuiBasicTableColumn, EuiLink } from '@elastic/eui';

import { FormattedDate } from '@kbn/i18n-react';
import { Conversation } from '../../../assistant_context/types';
import { AIConnector } from '../../../connectorland/connector_selector';
import { getConnectorTypeTitle } from '../../../connectorland/helpers';
import { Prompt } from '../../../..';
import { getApiConfig } from '../../use_conversation/helpers';
import * as i18n from './translations';
import { RowActions } from '../../common/components/assistant_settings_management/row_actions';
import { SystemPromptColumn } from './system_prompt_column';

const emptyConversations = {};

export interface GetConversationsListParams {
  allSystemPrompts: Prompt[];
  actionTypeRegistry: ActionTypeRegistryContract;
  connectors: AIConnector[] | undefined;
  conversations: Record<string, Conversation>;
  defaultConnector?: AIConnector;
}

export type ConversationTableItem = Conversation & {
  actionType?: string | null;
};

export const useConversationsTable = () => {
  const getColumns = useCallback(
    ({
      onDeleteActionClicked,
      onEditActionClicked,
      allSystemPrompts,
    }): Array<EuiBasicTableColumn<ConversationTableItem>> => {
      return [
        {
          name: i18n.CONVERSATIONS_TABLE_COLUMN_CONVERSATIONS,
          render: (conversation: ConversationTableItem) => (
            <EuiLink onClick={() => onEditActionClicked(conversation)}>
              {conversation.title}
            </EuiLink>
          ),
        },
        {
          name: i18n.CONVERSATIONS_TABLE_COLUMN_SYSTEM_PROMPT,
          align: 'center',
          render: (conversation: ConversationTableItem) => (
            <SystemPromptColumn allSystemPrompts={allSystemPrompts} conversation={conversation} />
          ),
        },
        {
          field: 'actionType',
          name: i18n.CONVERSATIONS_TABLE_COLUMN_CONNECTOR,
          align: 'center',
          render: (actionType: ConversationTableItem['actionType']) =>
            actionType ? <EuiBadge color="hollow">{actionType}</EuiBadge> : null,
        },
        {
          field: 'updatedAt',
          name: i18n.CONVERSATIONS_TABLE_COLUMN_UPDATED_AT,
          align: 'center',
          render: (updatedAt: ConversationTableItem['updatedAt']) =>
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
        },
        {
          name: i18n.CONVERSATIONS_TABLE_COLUMN_ACTIONS,
          width: '120px',
          align: 'center',
          render: (conversation: ConversationTableItem) => {
            const isDeletable = !conversation.isDefault;
            return (
              <RowActions<ConversationTableItem>
                rowItem={conversation}
                onDelete={isDeletable ? onDeleteActionClicked : undefined}
                onEdit={onEditActionClicked}
                isDeletable={isDeletable}
              />
            );
          },
        },
      ];
    },
    []
  );
  const getConversationsList = useCallback(
    ({
      allSystemPrompts,
      actionTypeRegistry,
      connectors,
      conversations = emptyConversations,
      defaultConnector,
    }: GetConversationsListParams): ConversationTableItem[] => {
      return Object.values(conversations).map((conversation) => {
        const conversationApiConfig = getApiConfig({
          allSystemPrompts,
          connectors,
          conversation,
          defaultConnector,
        });
        const connector: AIConnector | undefined = connectors?.find(
          (c) => c.id === conversationApiConfig.apiConfig?.connectorId
        );

        const actionType = getConnectorTypeTitle(connector, actionTypeRegistry);

        return {
          ...conversation,
          actionType,
          ...conversationApiConfig,
        };
      });
    },
    []
  );

  return { getColumns, getConversationsList };
};
