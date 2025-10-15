/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import React, { Suspense, useCallback, useMemo, useState, useEffect } from 'react';

import type { ActionConnector, ActionType } from '@kbn/triggers-actions-ui-plugin/public';
import type { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { some } from 'lodash';

import { useKibana } from '../../../hooks/use_kibana';
import { useLoadConnectors } from '../../../hooks/use_load_connectors';
import { useLoadActionTypes } from '../../../hooks/use_load_action_types';
import { useDefaultConnector } from '../../../hooks/use_default_connector';
import * as i18n from './translations';
import { getActionTypeTitle, getGenAiConfig } from './helpers';
import { AddConnectorModal } from './add_connector_modal';

export const ADD_NEW_CONNECTOR = 'ADD_NEW_CONNECTOR';

interface Props {
  fullWidth?: boolean;
  isDisabled?: boolean;
  isOpen?: boolean;
  onConnectorSelectionChange?: (connector: AIConnector) => void;
  selectedConnectorId?: string;
  displayFancy?: (displayText: string) => React.ReactNode;
  setIsOpen?: (isOpen: boolean) => void;
}

export type AIConnector = ActionConnector & {
  // related to OpenAI connectors, ex: Azure OpenAI, OpenAI
  apiProvider?: OpenAiProviderType;
};

export const ConnectorSelector: React.FC<Props> = React.memo(
  ({
    isDisabled = false,
    isOpen = false,
    fullWidth = false,
    displayFancy,
    selectedConnectorId,
    onConnectorSelectionChange,
    setIsOpen,
  }) => {
    const { euiTheme } = useEuiTheme();
    const { services } = useKibana();
    const {
      http,
      notifications: { toasts },
      triggersActionsUi,
    } = services;

    const actionTypeRegistry = triggersActionsUi.actionTypeRegistry;

    // Connector Modal State
    const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
    const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);

    // Load connectors and action types using the hooks
    const { data: aiConnectors, refetch: refetchConnectors } = useLoadConnectors({
      http,
      toasts,
    });

    const { data: actionTypes } = useLoadActionTypes({
      http,
      toasts,
    });

    // Load default connector
    const { data: defaultConnector } = useDefaultConnector();

    // Auto-select default connector when no connector is selected and default connector is available
    useEffect(() => {
      if (!selectedConnectorId && defaultConnector && aiConnectors && onConnectorSelectionChange) {
        // Find the corresponding connector in the loaded connectors
        const matchingConnector = aiConnectors.find(
          (connector) => connector.id === defaultConnector.connectorId
        );
        if (matchingConnector) {
          onConnectorSelectionChange(matchingConnector);
        }
      }
    }, [selectedConnectorId, defaultConnector, aiConnectors, onConnectorSelectionChange]);

    const addNewConnectorOption = useMemo(() => {
      return {
        value: ADD_NEW_CONNECTOR,
        inputDisplay: i18n.ADD_NEW_CONNECTOR,
        dropdownDisplay: (
          <EuiFlexGroup gutterSize="none" key={ADD_NEW_CONNECTOR}>
            <EuiFlexItem grow={true}>
              <EuiButtonEmpty
                data-test-subj="addNewConnectorButton"
                href="#"
                isDisabled={isDisabled}
                iconType="plus"
                size="xs"
              >
                {i18n.ADD_NEW_CONNECTOR}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* Right offset to compensate for 'selected' icon of EuiSuperSelect since native footers aren't supported*/}
              <div style={{ width: '24px' }} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    }, [isDisabled]);

    const connectorOptions = useMemo(
      () =>
        (aiConnectors ?? []).map((connector) => {
          const connectorDetails = connector.isPreconfigured
            ? i18n.PRECONFIGURED_CONNECTOR
            : getGenAiConfig(connector)?.apiProvider ??
              getActionTypeTitle(actionTypeRegistry.get(connector.actionTypeId));

          return {
            value: connector.id,
            'data-test-subj': connector.id,
            inputDisplay: displayFancy?.(connector.name) ?? connector.name,
            dropdownDisplay: (
              <React.Fragment key={connector.id}>
                <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
                  <EuiFlexItem grow={false} data-test-subj={`connector-${connector.name}`}>
                    <strong>{connector.name}</strong>
                    {connectorDetails && (
                      <EuiText size="xs" color="subdued">
                        <p>{connectorDetails}</p>
                      </EuiText>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </React.Fragment>
            ),
          };
        }),
      [actionTypeRegistry, aiConnectors, displayFancy]
    );

    const connectorExists = useMemo(
      () => some(aiConnectors, ['id', selectedConnectorId]),
      [aiConnectors, selectedConnectorId]
    );

    // Include add new connector option
    const allConnectorOptions = useMemo(
      () => [...connectorOptions, addNewConnectorOption],
      [addNewConnectorOption, connectorOptions]
    );

    const cleanupAndCloseModal = useCallback(() => {
      setIsOpen?.(false);
      setIsConnectorModalVisible(false);
      setSelectedActionType(null);
    }, [setIsOpen]);

    const [modalForceOpen, setModalForceOpen] = useState(isOpen);

    const onChange = useCallback(
      (connectorId: string) => {
        if (connectorId === ADD_NEW_CONNECTOR) {
          setModalForceOpen(false);
          setIsConnectorModalVisible(true);
          return;
        }

        const connector = (aiConnectors ?? []).find((c) => c.id === connectorId);
        if (connector && onConnectorSelectionChange) {
          onConnectorSelectionChange(connector);
        }
      },
      [aiConnectors, onConnectorSelectionChange]
    );

    const onSaveConnector = useCallback(
      (connector: ActionConnector) => {
        onConnectorSelectionChange?.({
          ...connector,
        });
        refetchConnectors?.();
        cleanupAndCloseModal();
      },
      [cleanupAndCloseModal, onConnectorSelectionChange, refetchConnectors]
    );

    return (
      <>
        {!connectorExists && !connectorOptions.length ? (
          <EuiButtonEmpty
            data-test-subj="addNewConnectorButton"
            iconType="plusInCircle"
            isDisabled={isDisabled}
            size="xs"
            onClick={() => setIsConnectorModalVisible(true)}
          >
            {i18n.ADD_CONNECTOR}
          </EuiButtonEmpty>
        ) : (
          <EuiSuperSelect
            aria-label={i18n.CONNECTOR_SELECTOR_TITLE}
            className={css`
              .euiSuperSelectControl__placeholder {
                color: ${euiTheme.colors.textPrimary};
                margin-right: ${euiTheme.size.xs};
              }
            `}
            compressed={true}
            data-test-subj="connector-selector"
            disabled={isDisabled}
            fullWidth={fullWidth}
            hasDividers={true}
            isOpen={modalForceOpen}
            onChange={onChange}
            options={allConnectorOptions}
            valueOfSelected={selectedConnectorId}
            placeholder={i18n.INLINE_CONNECTOR_PLACEHOLDER}
            popoverProps={{ panelMinWidth: 400, anchorPosition: 'downRight' }}
          />
        )}
        {isConnectorModalVisible && (
          <Suspense fallback>
            <AddConnectorModal
              actionTypeRegistry={actionTypeRegistry}
              actionTypes={actionTypes}
              onClose={cleanupAndCloseModal}
              onSaveConnector={onSaveConnector}
              onSelectActionType={(actionType: ActionType) => setSelectedActionType(actionType)}
              selectedActionType={selectedActionType}
            />
          </Suspense>
        )}
      </>
    );
  }
);

ConnectorSelector.displayName = 'ConnectorSelector';
