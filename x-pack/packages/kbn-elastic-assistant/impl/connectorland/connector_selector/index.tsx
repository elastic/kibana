/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import {
  ActionConnector,
  ActionTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';

import { HttpSetup } from '@kbn/core-http-browser';
import { ActionConnectorProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { ConnectorAddModal } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import {
  GEN_AI_CONNECTOR_ID,
  OpenAiProviderType,
} from '@kbn/stack-connectors-plugin/public/common';
import { useLoadConnectors } from '../use_load_connectors';
import * as i18n from '../translations';
import { useLoadActionTypes } from '../use_load_action_types';
import { useAssistantContext } from '../../assistant_context';

export const ADD_NEW_CONNECTOR = 'ADD_NEW_CONNECTOR';
interface Props {
  actionTypeRegistry: ActionTypeRegistryContract;
  http: HttpSetup;
  isDisabled?: boolean;
  onConnectorSelectionChange: (connectorId: string, provider: OpenAiProviderType) => void;
  selectedConnectorId?: string;
  onConnectorModalVisibilityChange?: (isVisible: boolean) => void;
}

interface Config {
  apiProvider: string;
}

export const ConnectorSelector: React.FC<Props> = React.memo(
  ({
    actionTypeRegistry,
    http,
    isDisabled = false,
    onConnectorModalVisibilityChange,
    selectedConnectorId,
    onConnectorSelectionChange,
  }) => {
    const { assistantAvailability } = useAssistantContext();
    // Connector Modal State
    const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
    const { data: actionTypes } = useLoadActionTypes({ http });
    const actionType = actionTypes?.find((at) => at.id === GEN_AI_CONNECTOR_ID) ?? {
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'platinum',
      supportedFeatureIds: ['general'],
      isSystemActionType: false,
      id: '.gen-ai',
      name: 'Generative AI',
      enabled: true,
    };

    const {
      data: connectors,
      isLoading: isLoadingActionTypes,
      isFetching: isFetchingActionTypes,
      refetch: refetchConnectors,
    } = useLoadConnectors({ http });
    const isLoading = isLoadingActionTypes || isFetchingActionTypes;
    const localIsDisabled = isDisabled || !assistantAvailability.hasConnectorsReadPrivilege;

    const addNewConnectorOption = useMemo(() => {
      return {
        value: ADD_NEW_CONNECTOR,
        inputDisplay: i18n.ADD_NEW_CONNECTOR,
        dropdownDisplay: (
          <EuiFlexGroup gutterSize="none" key={ADD_NEW_CONNECTOR}>
            <EuiFlexItem grow={true}>
              <EuiButtonEmpty href="#" iconType="plus" size="xs">
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

    const connectorOptions = useMemo(() => {
      return (
        connectors?.map((connector) => {
          const apiProvider: string | undefined = (
            connector as ActionConnectorProps<Config, unknown>
          )?.config?.apiProvider;
          return {
            value: connector.id,
            inputDisplay: connector.name,
            dropdownDisplay: (
              <React.Fragment key={connector.id}>
                <strong>{connector.name}</strong>
                {apiProvider && (
                  <EuiText size="s" color="subdued">
                    <p>{apiProvider}</p>
                  </EuiText>
                )}
              </React.Fragment>
            ),
          };
        }) ?? []
      );
    }, [connectors]);

    // Only include add new connector option if user has privilege
    const allConnectorOptions = useMemo(
      () =>
        assistantAvailability.hasConnectorsAllPrivilege
          ? [...connectorOptions, addNewConnectorOption]
          : [...connectorOptions],
      [addNewConnectorOption, assistantAvailability.hasConnectorsAllPrivilege, connectorOptions]
    );

    const cleanupAndCloseModal = useCallback(() => {
      onConnectorModalVisibilityChange?.(false);
      setIsConnectorModalVisible(false);
    }, [onConnectorModalVisibilityChange]);

    const onChange = useCallback(
      (connectorId: string) => {
        if (connectorId === ADD_NEW_CONNECTOR) {
          onConnectorModalVisibilityChange?.(true);
          setIsConnectorModalVisible(true);
          return;
        }

        const apiProvider = (
          connectors?.find((c) => c.id === connectorId) as ActionConnectorProps<Config, unknown>
        )?.config.apiProvider as OpenAiProviderType;
        onConnectorSelectionChange(connectorId, apiProvider);
      },
      [connectors, onConnectorSelectionChange, onConnectorModalVisibilityChange]
    );

    return (
      <>
        <EuiSuperSelect
          aria-label={i18n.CONNECTOR_SELECTOR_TITLE}
          compressed={true}
          disabled={localIsDisabled}
          hasDividers={true}
          isLoading={isLoading}
          onChange={onChange}
          options={allConnectorOptions}
          valueOfSelected={selectedConnectorId ?? ''}
        />
        {isConnectorModalVisible && (
          <ConnectorAddModal
            actionType={actionType}
            onClose={cleanupAndCloseModal}
            postSaveEventHandler={(savedAction: ActionConnector) => {
              onConnectorSelectionChange(
                savedAction.id,
                (savedAction as ActionConnectorProps<Config, unknown>)?.config
                  .apiProvider as OpenAiProviderType
              );
              refetchConnectors?.();
              cleanupAndCloseModal();
            }}
            actionTypeRegistry={actionTypeRegistry}
          />
        )}
      </>
    );
  }
);

ConnectorSelector.displayName = 'ConnectorSelector';
