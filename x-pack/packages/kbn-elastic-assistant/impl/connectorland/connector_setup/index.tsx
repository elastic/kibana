/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/common/constants';

import { ActionType } from '@kbn/triggers-actions-ui-plugin/public';
import { AddConnectorModal } from '../add_connector_modal';
import { WELCOME_CONVERSATION } from '../../assistant/use_conversation/sample_conversations';
import { Conversation } from '../../..';
import { useLoadActionTypes } from '../use_load_action_types';
import { useConversation } from '../../assistant/use_conversation';
import { useAssistantContext } from '../../assistant_context';
import { useLoadConnectors } from '../use_load_connectors';
import { getGenAiConfig } from '../helpers';

export interface ConnectorSetupProps {
  conversation?: Conversation;
  onConversationUpdate?: ({ cId, cTitle }: { cId: string; cTitle: string }) => Promise<void>;
  updateConversationsOnSaveConnector?: boolean;
}

export const ConnectorSetup = ({
  conversation: defaultConversation,
  onConversationUpdate,
  updateConversationsOnSaveConnector = true,
}: ConnectorSetupProps) => {
  const conversation = useMemo(
    () => defaultConversation || WELCOME_CONVERSATION,
    [defaultConversation]
  );
  const { setApiConfig } = useConversation();
  // Access all conversations so we can add connector to all on initial setup
  const { actionTypeRegistry, http } = useAssistantContext();

  const { refetch: refetchConnectors } = useLoadConnectors({ http });

  const { data: actionTypes } = useLoadActionTypes({ http });

  const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);

  const onSaveConnector = useCallback(
    async (connector: ActionConnector) => {
      if (updateConversationsOnSaveConnector) {
        // this side effect is not required for Attack discovery, because the connector is not used in a conversation
        const config = getGenAiConfig(connector);
        // persist only the active conversation
        const updatedConversation = await setApiConfig({
          conversation,
          apiConfig: {
            ...conversation.apiConfig,
            connectorId: connector.id,
            actionTypeId: connector.actionTypeId,
            provider: config?.apiProvider,
            model: config?.defaultModel,
          },
        });

        if (updatedConversation) {
          onConversationUpdate?.({
            cId: updatedConversation.id,
            cTitle: updatedConversation.title,
          });

          refetchConnectors?.();
        }
      } else {
        refetchConnectors?.();
      }
    },
    [
      conversation,
      onConversationUpdate,
      refetchConnectors,
      setApiConfig,
      updateConversationsOnSaveConnector,
    ]
  );

  const handleClose = useCallback(() => {
    setSelectedActionType(null);
  }, []);

  return (
    <AddConnectorModal
      actionTypeRegistry={actionTypeRegistry}
      actionTypes={actionTypes}
      onClose={handleClose}
      onSaveConnector={onSaveConnector}
      onSelectActionType={setSelectedActionType}
      selectedActionType={selectedActionType}
      actionTypeSelectorInline={true}
    />
  );
};
