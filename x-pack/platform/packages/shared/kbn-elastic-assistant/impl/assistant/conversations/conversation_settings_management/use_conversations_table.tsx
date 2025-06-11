/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiBadge, EuiBasicTableColumn, EuiCheckbox, EuiLink } from '@elastic/eui';

import { FormattedDate } from '@kbn/i18n-react';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { Conversation } from '../../../assistant_context/types';
import { AIConnector } from '../../../connectorland/connector_selector';
import { getConnectorTypeTitle } from '../../../connectorland/helpers';
import { getConversationApiConfig } from '../../use_conversation/helpers';
import * as i18n from './translations';
import { useInlineActions } from '../../common/components/assistant_settings_management/inline_actions';

const emptyConversations = {};

export interface GetConversationsListParams {
  allSystemPrompts: PromptResponse[];
  actionTypeRegistry: ActionTypeRegistryContract;
  connectors: AIConnector[] | undefined;
  conversations: Record<string, Conversation>;
  defaultConnector?: AIConnector;
}

export type ConversationTableItem = Conversation & {
  connectorTypeTitle?: string | null;
  systemPromptTitle?: string | null;
};

const InputCheckbox = ({
  conversation,
  deletedConversationsIds,
  setDeletedConversations,
  isDeleteAll,
}: {
  conversation: ConversationTableItem;
  deletedConversationsIds: string[];
  setDeletedConversations: React.Dispatch<React.SetStateAction<ConversationTableItem[]>>;
  isDeleteAll: boolean;
}) => {
  const [checked, setChecked] = useState(
    isDeleteAll || deletedConversationsIds.includes(conversation.id)
  );

  useEffect(() => {
    setChecked(isDeleteAll || deletedConversationsIds.includes(conversation.id));
  }, [isDeleteAll, deletedConversationsIds, conversation.id]);

  return (
    <EuiCheckbox
      data-test-subj={`conversationSelect-${conversation.id}`}
      id={`conversationSelect-${conversation.id}`}
      checked={checked}
      disabled={isDeleteAll}
      onChange={(e) => {
        if (e.target.checked) {
          setChecked(true);
          setDeletedConversations((prev) => [...prev, conversation]);
        } else {
          setChecked(false);
          setDeletedConversations((prev) => prev.filter(({ id }) => id !== conversation.id));
        }
      }}
    />
  );
};

const PageSelectionCheckbox = ({
  conversationOptionsIds,
  deletedConversationsIds,
  handlePageSelection,
  handlePageUnselecting,
  isDeleteAll,
}: {
  conversationOptionsIds: string[];
  deletedConversationsIds: string[];
  handlePageSelection: () => void;
  handlePageUnselecting: () => void;
  isDeleteAll: boolean;
}) => {
  const [pageSelectionChecked, setPageSelectionChecked] = useState(
    isDeleteAll || conversationOptionsIds.every((id) => deletedConversationsIds.includes(id))
  );

  useEffect(() => {
    setPageSelectionChecked(
      isDeleteAll || conversationOptionsIds.every((id) => deletedConversationsIds.includes(id))
    );
  }, [isDeleteAll, deletedConversationsIds, conversationOptionsIds]);

  return (
    <EuiCheckbox
      data-test-subj={`conversationPageSelect`}
      id={`conversationPageSelect`}
      checked={pageSelectionChecked}
      disabled={isDeleteAll}
      onChange={(e) => {
        if (e.target.checked) {
          setPageSelectionChecked(true);
          handlePageSelection();
        } else {
          setPageSelectionChecked(false);
          handlePageUnselecting();
        }
      }}
    />
  );
};

export const useConversationsTable = () => {
  const getActions = useInlineActions<ConversationTableItem>();
  const getColumns = useCallback(
    ({
      isDeleteEnabled,
      isEditEnabled,
      onDeleteActionClicked,
      onEditActionClicked,
      handlePageSelection,
      handlePageUnselecting,
      conversationOptionsIds,
      deletedConversationsIds,
      setDeletedConversations,
      isDeleteAll,
    }: {
      isDeleteEnabled: (conversation: ConversationTableItem) => boolean;
      isEditEnabled: (conversation: ConversationTableItem) => boolean;
      onDeleteActionClicked: (conversation: ConversationTableItem) => void;
      onEditActionClicked: (conversation: ConversationTableItem) => void;
      handlePageSelection: () => void;
      handlePageUnselecting: () => void;
      conversationOptionsIds: string[];
      deletedConversationsIds: string[];
      setDeletedConversations: React.Dispatch<React.SetStateAction<ConversationTableItem[]>>;
      isDeleteAll: boolean;
    }): Array<EuiBasicTableColumn<ConversationTableItem>> => {
      return [
        {
          name: (
            <PageSelectionCheckbox
              isDeleteAll={isDeleteAll}
              conversationOptionsIds={conversationOptionsIds}
              deletedConversationsIds={deletedConversationsIds}
              handlePageSelection={handlePageSelection}
              handlePageUnselecting={handlePageUnselecting}
            />
          ),
          render: (conversation: ConversationTableItem) => (
            <InputCheckbox
              conversation={conversation}
              deletedConversationsIds={deletedConversationsIds}
              setDeletedConversations={setDeletedConversations}
              isDeleteAll={isDeleteAll}
            />
          ),
          width: '70px',
          sortable: false,
        },
        {
          name: i18n.CONVERSATIONS_TABLE_COLUMN_TITLE,
          render: (conversation: ConversationTableItem) => (
            <EuiLink onClick={() => onEditActionClicked(conversation)}>
              {conversation.title}
            </EuiLink>
          ),
          sortable: ({ title }: ConversationTableItem) => title,
        },
        {
          field: 'systemPromptTitle',
          name: i18n.CONVERSATIONS_TABLE_COLUMN_SYSTEM_PROMPT,
          align: 'left',
          render: (systemPromptTitle: ConversationTableItem['systemPromptTitle']) =>
            systemPromptTitle ? <EuiBadge color="hollow">{systemPromptTitle}</EuiBadge> : null,
          sortable: false,
        },
        {
          field: 'connectorTypeTitle',
          name: i18n.CONVERSATIONS_TABLE_COLUMN_CONNECTOR,
          align: 'left',
          render: (connectorTypeTitle: ConversationTableItem['connectorTypeTitle']) =>
            connectorTypeTitle ? <EuiBadge color="hollow">{connectorTypeTitle}</EuiBadge> : null,
          sortable: false,
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
          sortable: true,
        },
        {
          width: '120px',
          align: 'center',
          ...getActions({
            isDeleteEnabled,
            isEditEnabled,
            onDelete: onDeleteActionClicked,
            onEdit: onEditActionClicked,
          }),
        },
      ];
    },
    [getActions]
  );
  const getConversationsList = useCallback(
    ({
      allSystemPrompts,
      actionTypeRegistry,
      connectors,
      conversations = emptyConversations,
      defaultConnector,
    }: GetConversationsListParams): ConversationTableItem[] =>
      Object.values(conversations).map((conversation) => {
        const conversationApiConfig = getConversationApiConfig({
          allSystemPrompts,
          connectors,
          conversation,
          defaultConnector,
        });
        const connector: AIConnector | undefined = connectors?.find(
          (c) => c.id === conversationApiConfig.apiConfig?.connectorId
        );
        const connectorTypeTitle = getConnectorTypeTitle(connector, actionTypeRegistry);

        const systemPrompt: PromptResponse | undefined = allSystemPrompts.find(
          ({ id }) => id === conversation.apiConfig?.defaultSystemPromptId
        );

        const systemPromptTitle = systemPrompt?.name || systemPrompt?.id;

        return {
          ...conversation,
          connectorTypeTitle,
          systemPromptTitle,
          ...conversationApiConfig,
        };
      }),
    []
  );

  return {
    getColumns,
    getConversationsList,
  };
};
