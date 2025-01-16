/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { css } from '@emotion/css';
import type { AttackDiscoveryStats } from '@kbn/elastic-assistant-common';
import { AIConnector, ConnectorSelector } from '../connector_selector';
import { Conversation } from '../../..';
import { useAssistantContext } from '../../assistant_context';
import { useConversation } from '../../assistant/use_conversation';
import { getGenAiConfig } from '../helpers';

export const ADD_NEW_CONNECTOR = 'ADD_NEW_CONNECTOR';

interface Props {
  isDisabled?: boolean;
  selectedConnectorId?: string;
  selectedConversation?: Conversation;
  onConnectorIdSelected?: (connectorId: string) => void;
  onConnectorSelected?: (conversation: Conversation) => void;
  stats?: AttackDiscoveryStats | null;
}

const inputContainerClassName = css`
  height: 32px;

  .euiSuperSelectControl {
    border: none;
    box-shadow: none;
    background: none;
    padding-left: 0;
  }

  .euiFormControlLayoutIcons {
    right: 14px;
    top: 2px;
  }
`;

const inputDisplayClassName = css`
  margin-right: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/**
 * A compact wrapper of the ConnectorSelector component used in the Settings modal.
 */
export const ConnectorSelectorInline: React.FC<Props> = React.memo(
  ({
    isDisabled = false,
    selectedConnectorId,
    selectedConversation,
    onConnectorIdSelected,
    onConnectorSelected,
    stats = null,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { assistantAvailability } = useAssistantContext();
    const { setApiConfig } = useConversation();

    const localIsDisabled = isDisabled || !assistantAvailability.hasConnectorsReadPrivilege;

    const onChange = useCallback(
      async (connector: AIConnector) => {
        const connectorId = connector.id;
        if (connectorId === ADD_NEW_CONNECTOR) {
          return;
        }

        const config = getGenAiConfig(connector);
        const apiProvider = config?.apiProvider;
        const model = config?.defaultModel;
        setIsOpen(false);

        if (selectedConversation != null) {
          const conversation = await setApiConfig({
            conversation: selectedConversation,
            apiConfig: {
              ...selectedConversation.apiConfig,
              actionTypeId: connector.actionTypeId,
              connectorId,
              // With the inline component, prefer config args to handle 'new connector' case
              provider: apiProvider,
              model,
            },
          });

          if (conversation && onConnectorSelected != null) {
            onConnectorSelected(conversation);
          }
        }

        if (onConnectorIdSelected != null) {
          onConnectorIdSelected(connectorId);
        }
      },
      [selectedConversation, setApiConfig, onConnectorIdSelected, onConnectorSelected]
    );

    return (
      <EuiFlexGroup
        alignItems="center"
        className={inputContainerClassName}
        direction="row"
        gutterSize="xs"
        justifyContent={'flexStart'}
        responsive={false}
      >
        <EuiFlexItem>
          <ConnectorSelector
            displayFancy={(displayText) => (
              <EuiText
                className={inputDisplayClassName}
                size="s"
                color={euiTheme.colors.textPrimary}
              >
                {displayText}
              </EuiText>
            )}
            isOpen={isOpen}
            isDisabled={localIsDisabled}
            selectedConnectorId={selectedConnectorId}
            setIsOpen={setIsOpen}
            onConnectorSelectionChange={onChange}
            stats={stats}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConnectorSelectorInline.displayName = 'ConnectorSelectorInline';
