/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ActionConnector } from '@kbn/alerts-ui-shared';
import { AddConnector } from '@kbn/ai-assistant-cta';
import { GenerativeAIForSecurityConnectorFeatureId } from '@kbn/actions-plugin/common';

import { Conversation, useAssistantContext, useLoadConnectors } from '../../..';
import { getGenAiConfig } from '../../connectorland/helpers';
import { useConversation } from '../use_conversation';
import { WELCOME_CONVERSATION } from '../use_conversation/sample_conversations';

/**
 * Props for the `CreateConnector` component.
 */
export interface CreateConnectorProps {
  /** The current conversation. Defaults to the Welcome conversation. */
  currentConversation?: Conversation;
  /** Handler for an update to a conversation. */
  onConversationUpdate?: ({ cId }: { cId: string }) => Promise<void>;
}

/**
 * A component that prompts a user to add a connector using the Add Connector call-to-action and the Add Connector flyout,
 * and updates a given conversation with the connector.
 */
export const CreateConnector = ({
  currentConversation = WELCOME_CONVERSATION,
  onConversationUpdate,
}: CreateConnectorProps) => {
  const { setApiConfig } = useConversation();
  // Access all conversations so we can add connector to all on initial setup
  const { http, inferenceEnabled, triggersActionsUi } = useAssistantContext();

  const { refetch: refetchConnectors } = useLoadConnectors({ http, inferenceEnabled });
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const ConnectorFlyout = useMemo(
    () => triggersActionsUi.getAddConnectorFlyout,
    [triggersActionsUi]
  );

  const onConnectorCreated = useCallback(
    async (connector: ActionConnector) => {
      // this side effect is not required for Attack discovery, because the connector is not used in a conversation
      const config = getGenAiConfig(connector);

      // persist only the active conversation
      const updatedConversation = await setApiConfig({
        conversation: currentConversation,
        apiConfig: {
          ...currentConversation.apiConfig,
          connectorId: connector.id,
          actionTypeId: connector.actionTypeId,
          provider: config?.apiProvider,
          model: config?.defaultModel,
        },
      });

      if (updatedConversation) {
        onConversationUpdate?.({
          cId: updatedConversation.id,
        });

        refetchConnectors?.();
      }
    },
    [currentConversation, setApiConfig, onConversationUpdate, refetchConnectors]
  );

  return (
    <>
      <AddConnector onAddConnector={() => setIsFlyoutOpen(true)} />
      {isFlyoutOpen ? (
        <ConnectorFlyout
          onClose={() => setIsFlyoutOpen(false)}
          onConnectorCreated={onConnectorCreated}
          featureId={GenerativeAIForSecurityConnectorFeatureId}
        />
      ) : null}
    </>
  );
};
