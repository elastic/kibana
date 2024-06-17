/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { Conversation } from '../../../assistant_context/types';
import { AIConnector } from '../../../connectorland/connector_selector';
import { getConnectorTypeTitle } from '../../../connectorland/helpers';
import { Prompt } from '../../../..';
import { getDefaultSystemPrompt } from '../../use_conversation/helpers';

const emptyConversations = {};

export interface UseConversationSelectorSettingsProps {
  allSystemPrompts: Prompt[];
  actionTypeRegistry: ActionTypeRegistryContract;
  connectors: AIConnector[] | undefined;
  conversations: Record<string, Conversation>;
}

export type ConversationTableItem = Conversation & {
  actionType?: string | null;
  systemPrompt?: string;
};

export const useConversationsList = ({
  allSystemPrompts,
  actionTypeRegistry,
  connectors,
  conversations = emptyConversations,
}: UseConversationSelectorSettingsProps) => {
  const conversationOptions = useMemo<ConversationTableItem[]>(() => {
    return Object.values(conversations).map((conversation) => {
      const connector: AIConnector | undefined = connectors?.find(
        (c) => c.id === conversation.apiConfig?.connectorId
      );

      const actionType = getConnectorTypeTitle(connector, actionTypeRegistry);
      const systemPrompt: Prompt | undefined = allSystemPrompts.find(
        ({ id }) => id === conversation.apiConfig?.defaultSystemPromptId
      );

      const defaultSystemPrompt = getDefaultSystemPrompt({
        allSystemPrompts,
        conversation,
      });
      return {
        ...conversation,
        actionType,
        systemPrompt:
          systemPrompt?.label ??
          systemPrompt?.name ??
          defaultSystemPrompt?.label ??
          defaultSystemPrompt?.name,
      };
    });
  }, [allSystemPrompts, actionTypeRegistry, connectors, conversations]);

  return conversationOptions;
};
