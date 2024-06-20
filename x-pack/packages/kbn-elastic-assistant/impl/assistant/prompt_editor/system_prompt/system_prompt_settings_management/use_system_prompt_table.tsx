/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink, EuiBadge } from '@elastic/eui';
import React from 'react';
import { Conversation } from '../../../../assistant_context/types';
import { AIConnector } from '../../../../connectorland/connector_selector';
import { RowActions } from '../../../common/components/assistant_settings_management/row_actions';
import { Prompt } from '../../../types';
import { getApiConfig, getDefaultSystemPrompt } from '../../../use_conversation/helpers';
import * as i18n from './translations';
import { getSelectedConversations } from './utils';

type ConversationsWithSystemPrompt = Record<
  string,
  Conversation & { systemPrompt: Prompt | undefined }
>;

type SystemPromptTableItem = Prompt & { defaultConversations: string[] };

export const useSystemPromptTable = () => {
  const getColumns = ({
    onEditActionClicked,
    onDeleteActionClicked,
  }: {
    onEditActionClicked: (prompt: SystemPromptTableItem) => void;
    onDeleteActionClicked: (prompt: SystemPromptTableItem) => void;
  }) => [
    {
      name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_NAME,
      render: (prompt: SystemPromptTableItem) =>
        prompt?.name ? (
          <EuiLink onClick={() => onEditActionClicked(prompt)}>{prompt?.name}</EuiLink>
        ) : null,
    },
    {
      field: 'defaultConversations',
      name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_DEFAULT_CONVERSATIONS,
      render: (defaultConversations: string[]) =>
        defaultConversations.map((c, idx) => (
          <EuiBadge id={`${idx}`} color="hollow">
            {c}
          </EuiBadge>
        )),
    },
    /* TODO: enable when createdAt is added
      {
        field: 'createdAt',
        name: i18n.SYSTEM_PROMPTS_TABLE_COLUMN_CREATED_ON,
      },
      */
    {
      name: 'Actions',
      width: '120px',
      render: (prompt: SystemPromptTableItem) => {
        const isDeletable = !prompt.isDefault;
        return (
          <RowActions<SystemPromptTableItem>
            rowItem={prompt}
            onEdit={onEditActionClicked}
            onDelete={isDeletable ? onDeleteActionClicked : undefined}
            isDeletable={isDeletable}
          />
        );
      },
    },
  ];

  const getSystemPromptsList = ({
    connectors,
    conversationSettings,
    defaultConnector,
    systemPromptSettings,
  }: {
    connectors: AIConnector[] | undefined;
    conversationSettings: Record<string, Conversation>;
    defaultConnector: AIConnector | undefined;
    systemPromptSettings: Prompt[];
  }): SystemPromptTableItem[] => {
    const conversationsWithApiConfig = Object.entries(
      conversationSettings
    ).reduce<ConversationsWithSystemPrompt>((acc, [key, conversation]) => {
      const defaultSystemPrompt = getDefaultSystemPrompt({
        allSystemPrompts: systemPromptSettings,
        conversation,
      });
      acc[key] = {
        ...conversation,
        ...getApiConfig({
          allSystemPrompts: systemPromptSettings,
          connectors,
          conversation,
          defaultConnector,
        }),
        systemPrompt: defaultSystemPrompt,
      };
      return acc;
    }, {});

    return systemPromptSettings.map((systemPrompt) => {
      return {
        ...systemPrompt,
        defaultConversations: getSelectedConversations(
          systemPromptSettings,
          conversationsWithApiConfig,
          systemPrompt?.id
        ).map(({ title }) => title),
      };
    });
  };

  return { getColumns, getSystemPromptsList };
};
