/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { css } from '@emotion/css';
import type { ApiConfig, AttackDiscoveryStats } from '@kbn/elastic-assistant-common';
import type { AIConnector } from '../connector_selector';
import { ConnectorSelector } from '../connector_selector';
import type { Conversation } from '../../..';
import { useAssistantContext } from '../../assistant_context';
import { useConversation } from '../../assistant/use_conversation';
import { getGenAiConfig } from '../helpers';

export const ADD_NEW_CONNECTOR = 'ADD_NEW_CONNECTOR';

interface Props {
  fullWidth?: boolean;
  isDisabled?: boolean;
  selectedConnectorId?: string;
  selectedConversation?: Conversation;
  onConnectorIdSelected?: (connectorId: string) => void;
  onConnectorSelected?: (conversation: Conversation, apiConfig?: ApiConfig) => void;
  stats?: AttackDiscoveryStats | null;

  /**
   * Allows parent components to control whether the default connector should be
   * automatically selected or the explicit user selection action required.
   */
  explicitConnectorSelection?: boolean;
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

const fullWidthContainerClassName = css`
  .euiSuperSelect {
    max-inline-size: 100% !important;
  }

  .euiSuperSelectControl {
    max-inline-size: 100%;
  }

  .euiFormControlLayout {
    max-inline-size: 100%;
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
    fullWidth = false,
    isDisabled = false,
    selectedConnectorId,
    selectedConversation,
    onConnectorIdSelected,
    onConnectorSelected,
    stats = null,
    explicitConnectorSelection,
  }) => {
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
          if (selectedConversation.id === '' && onConnectorSelected != null) {
            onConnectorSelected(selectedConversation, {
              ...selectedConversation.apiConfig,
              connectorId,
              actionTypeId: connector.actionTypeId,
              provider: apiProvider,
              model,
            });
          } else {
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
        className={fullWidth ? fullWidthContainerClassName : inputContainerClassName}
        direction="row"
        gutterSize="xs"
        justifyContent={'flexStart'}
        responsive={false}
      >
        <EuiFlexItem>
          <ConnectorSelector
            fullWidth={fullWidth}
            displayFancy={(label) => (
              <EuiText className={inputDisplayClassName} size="s">
                {label}
              </EuiText>
            )}
            isOpen={isOpen}
            isDisabled={localIsDisabled}
            selectedConnectorId={selectedConnectorId}
            setIsOpen={setIsOpen}
            onConnectorSelectionChange={onChange}
            stats={stats}
            explicitConnectorSelection={explicitConnectorSelection}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConnectorSelectorInline.displayName = 'ConnectorSelectorInline';
