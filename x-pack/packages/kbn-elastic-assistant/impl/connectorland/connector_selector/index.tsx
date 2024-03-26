/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiText } from '@elastic/eui';
import React, { Suspense, useCallback, useMemo, useState } from 'react';

import { ActionConnector, ActionType } from '@kbn/triggers-actions-ui-plugin/public';

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { useLoadConnectors } from '../use_load_connectors';
import * as i18n from '../translations';
import { useLoadActionTypes } from '../use_load_action_types';
import { useAssistantContext } from '../../assistant_context';
import { getActionTypeTitle, getGenAiConfig } from '../helpers';
import { AddConnectorModal } from '../add_connector_modal';

export const ADD_NEW_CONNECTOR = 'ADD_NEW_CONNECTOR';

interface Props {
  isDisabled?: boolean;
  isOpen?: boolean;
  onConnectorSelectionChange: (connector: AIConnector) => void;
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
    displayFancy,
    selectedConnectorId,
    onConnectorSelectionChange,
    setIsOpen,
  }) => {
    const { actionTypeRegistry, http, assistantAvailability } = useAssistantContext();
    // Connector Modal State
    const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
    const { data: actionTypes } = useLoadActionTypes({ http });

    const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);

    const {
      data: aiConnectors,
      isLoading: isLoadingConnectors,
      isFetching: isFetchingConnectors,
      refetch: refetchConnectors,
    } = useLoadConnectors({ http });

    const isLoading = isLoadingConnectors || isFetchingConnectors;
    const localIsDisabled = isDisabled || !assistantAvailability.hasConnectorsReadPrivilege;

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
    }, []);

    const connectorOptions = useMemo(
      () =>
        (aiConnectors ?? []).map((connector) => {
          const connectorTypeTitle =
            getGenAiConfig(connector)?.apiProvider ??
            getActionTypeTitle(actionTypeRegistry.get(connector.actionTypeId));
          const connectorDetails = connector.isPreconfigured
            ? i18n.PRECONFIGURED_CONNECTOR
            : connectorTypeTitle;
          return {
            value: connector.id,
            'data-test-subj': connector.id,
            inputDisplay: displayFancy ? displayFancy(connector.name) : connector.name,
            dropdownDisplay: (
              <React.Fragment key={connector.id}>
                <strong>{connector.name}</strong>
                {connectorDetails && (
                  <EuiText size="xs" color="subdued">
                    <p>{connectorDetails}</p>
                  </EuiText>
                )}
              </React.Fragment>
            ),
          };
        }),
      [actionTypeRegistry, aiConnectors, displayFancy]
    );

    // Only include add new connector option if user has privilege
    const allConnectorOptions = useMemo(
      () =>
        assistantAvailability.hasConnectorsAllPrivilege
          ? [...connectorOptions, addNewConnectorOption]
          : [...connectorOptions],
      [addNewConnectorOption, assistantAvailability.hasConnectorsAllPrivilege, connectorOptions]
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
        if (connector) {
          onConnectorSelectionChange(connector);
        }
      },
      [aiConnectors, onConnectorSelectionChange]
    );

    const onSaveConnector = useCallback(
      (connector: ActionConnector) => {
        onConnectorSelectionChange({
          ...connector,
        });
        refetchConnectors?.();
        cleanupAndCloseModal();
      },
      [cleanupAndCloseModal, onConnectorSelectionChange, refetchConnectors]
    );

    return (
      <>
        <EuiSuperSelect
          aria-label={i18n.CONNECTOR_SELECTOR_TITLE}
          compressed={true}
          data-test-subj="connector-selector"
          disabled={localIsDisabled}
          hasDividers={true}
          isLoading={isLoading}
          isOpen={modalForceOpen}
          onChange={onChange}
          options={allConnectorOptions}
          valueOfSelected={selectedConnectorId ?? ''}
        />
        {isConnectorModalVisible && (
          // Crashing management app otherwise
          <Suspense fallback>
            <AddConnectorModal
              actionTypeRegistry={actionTypeRegistry}
              actionTypes={actionTypes}
              onClose={() => setIsConnectorModalVisible(false)}
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
