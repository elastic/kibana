/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AIConnector, Conversation, useAssistantContext } from '../../..';
import { isElasticManagedLlmConnector } from '../../connectorland/helpers';
import { ConnectorMissingCallout } from '../../connectorland/connector_missing_callout';
import { ElasticLlmCallout } from './elastic_llm_callout';

export const AssistantConversationBanner = React.memo(
  ({
    isSettingsModalVisible,
    setIsSettingsModalVisible,
    shouldShowMissingConnectorCallout,
    currentConversation,
    connectors,
  }: {
    isSettingsModalVisible: boolean;
    setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
    shouldShowMissingConnectorCallout: boolean;
    currentConversation: Conversation | undefined;
    connectors: AIConnector[] | undefined;
  }) => {
    const { inferenceEnabled } = useAssistantContext();
    const showEISCallout = useMemo(() => {
      if (inferenceEnabled && currentConversation && currentConversation.id !== '') {
        if (currentConversation?.apiConfig?.connectorId) {
          return connectors?.some(
            (c) =>
              c.id === currentConversation.apiConfig?.connectorId && isElasticManagedLlmConnector(c)
          );
        }
      }
    }, [inferenceEnabled, currentConversation, connectors]);
    if (shouldShowMissingConnectorCallout) {
      return (
        <ConnectorMissingCallout
          isConnectorConfigured={(connectors?.length ?? 0) > 0}
          isSettingsModalVisible={isSettingsModalVisible}
          setIsSettingsModalVisible={setIsSettingsModalVisible}
        />
      );
    }

    if (showEISCallout) {
      return <ElasticLlmCallout showEISCallout={showEISCallout} />;
    }

    return null;
  }
);

AssistantConversationBanner.displayName = 'AssistantConversationBanner';
