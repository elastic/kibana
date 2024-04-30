/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';
import { AIConnector, ConnectorSelector } from '../connector_selector';
import { Conversation } from '../../..';
import { useLoadConnectors } from '../use_load_connectors';
import * as i18n from '../translations';
import { useAssistantContext } from '../../assistant_context';
import { useConversation } from '../../assistant/use_conversation';
import { getGenAiConfig } from '../helpers';

export const ADD_NEW_CONNECTOR = 'ADD_NEW_CONNECTOR';

interface Props {
  isDisabled?: boolean;
  selectedConnectorId?: string;
  selectedConversation?: Conversation;
  isFlyoutMode: boolean;
  onConnectorIdSelected?: (connectorId: string) => void;
  onConnectorSelected?: (conversation: Conversation) => void;
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

const placeholderButtonClassName = css`
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
  font-weight: normal;
  padding: 0 14px 0 0;
`;

/**
 * A compact wrapper of the ConnectorSelector component used in the Settings modal.
 */
export const ConnectorSelectorInline: React.FC<Props> = React.memo(
  ({
    isDisabled = false,
    selectedConnectorId,
    selectedConversation,
    isFlyoutMode,

    onConnectorIdSelected,
    onConnectorSelected,
  }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { assistantAvailability, http } = useAssistantContext();
    const { setApiConfig } = useConversation();

    const { data: aiConnectors } = useLoadConnectors({
      http,
    });

    const selectedConnectorName =
      (aiConnectors ?? []).find((c) => c.id === selectedConnectorId)?.name ??
      i18n.INLINE_CONNECTOR_PLACEHOLDER;
    const localIsDisabled = isDisabled || !assistantAvailability.hasConnectorsReadPrivilege;

    const onConnectorClick = useCallback(() => {
      setIsOpen(!isOpen);
    }, [isOpen]);

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

    if (isFlyoutMode) {
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
                  color={euiThemeVars.euiColorPrimaryText}
                >
                  {displayText}
                </EuiText>
              )}
              isOpen={isOpen}
              isDisabled={localIsDisabled}
              selectedConnectorId={selectedConnectorId}
              setIsOpen={setIsOpen}
              onConnectorSelectionChange={onChange}
              isFlyoutMode={isFlyoutMode}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

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
          {isOpen ? (
            <ConnectorSelector
              displayFancy={(displayText) => (
                <EuiText className={inputDisplayClassName} size="xs">
                  {displayText}
                </EuiText>
              )}
              isOpen
              isDisabled={localIsDisabled}
              selectedConnectorId={selectedConnectorId}
              setIsOpen={setIsOpen}
              onConnectorSelectionChange={onChange}
              isFlyoutMode={isFlyoutMode}
            />
          ) : (
            <span>
              <EuiButtonEmpty
                className={placeholderButtonClassName}
                data-test-subj="connectorSelectorPlaceholderButton"
                iconSide={'right'}
                iconType="arrowDown"
                isDisabled={localIsDisabled}
                onClick={onConnectorClick}
                size={'xs'}
              >
                {selectedConnectorName}
              </EuiButtonEmpty>
            </span>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConnectorSelectorInline.displayName = 'ConnectorSelectorInline';
