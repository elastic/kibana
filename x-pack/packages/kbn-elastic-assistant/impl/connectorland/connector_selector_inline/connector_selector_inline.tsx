/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

import { ActionConnectorProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { ConnectorAddModal } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import {
  GEN_AI_CONNECTOR_ID,
  OpenAiProviderType,
} from '@kbn/stack-connectors-plugin/public/common';
import { css } from '@emotion/css/dist/emotion-css.cjs';
import { Conversation } from '../../..';
import { useLoadConnectors } from '../use_load_connectors';
import * as i18n from '../translations';
import { useLoadActionTypes } from '../use_load_action_types';
import { useAssistantContext } from '../../assistant_context';
import { useConversation } from '../../assistant/use_conversation';

export const ADD_NEW_CONNECTOR = 'ADD_NEW_CONNECTOR';
interface Props {
  isDisabled?: boolean;
  onConnectorSelectionChange: (connectorId: string, provider: OpenAiProviderType) => void;
  selectedConnectorId?: string;
  selectedConversation?: Conversation;
  onConnectorModalVisibilityChange?: (isVisible: boolean) => void;
}

interface Config {
  apiProvider: string;
}

const inputContainerClassName = css`
  height: 32px;

  .euiSuperSelect {
    width: 400px;
  }

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
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
`;

const placeholderButtonClassName = css`
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
  font-weight: normal;
  padding-bottom: 5px;
  padding-left: 0;
  padding-top: 2px;
`;

/**
 * A minimal and connected version of the ConnectorSelector component used in the Settings modal.
 */
export const ConnectorSelectorInline: React.FC<Props> = React.memo(
  ({
    isDisabled = false,
    onConnectorModalVisibilityChange,
    selectedConnectorId,
    selectedConversation,
    onConnectorSelectionChange,
  }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { actionTypeRegistry, http } = useAssistantContext();
    const { setApiConfig } = useConversation();
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
    const selectedConnectorName =
      connectors?.find((c) => c.id === selectedConnectorId)?.name ??
      i18n.INLINE_CONNECTOR_PLACEHOLDER;

    const addNewConnectorOption = useMemo(() => {
      return {
        value: ADD_NEW_CONNECTOR,
        inputDisplay: i18n.ADD_NEW_CONNECTOR,
        dropdownDisplay: (
          <EuiFlexGroup gutterSize="none" key={ADD_NEW_CONNECTOR}>
            <EuiFlexItem grow={true}>
              <EuiButtonEmpty data-test-subj="addNewConnectorButton" iconType="plus" size="xs">
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
            inputDisplay: (
              <EuiText className={inputDisplayClassName} size="xs">
                {connector.name}
              </EuiText>
            ),
            dropdownDisplay: (
              <React.Fragment key={connector.id}>
                <strong>{connector.name}</strong>
                {apiProvider && (
                  <EuiText size="xs" color="subdued">
                    <p>{apiProvider}</p>
                  </EuiText>
                )}
              </React.Fragment>
            ),
          };
        }) ?? []
      );
    }, [connectors]);

    const cleanupAndCloseModal = useCallback(() => {
      onConnectorModalVisibilityChange?.(false);
      setIsConnectorModalVisible(false);
    }, [onConnectorModalVisibilityChange]);

    const onConnectorClick = useCallback(() => {
      setIsOpen(!isOpen);
    }, [isOpen]);

    const handleOnBlur = useCallback(() => setIsOpen(false), []);

    const onChange = useCallback(
      (connectorId: string, apiProvider?: OpenAiProviderType) => {
        setIsOpen(false);

        if (connectorId === ADD_NEW_CONNECTOR) {
          onConnectorModalVisibilityChange?.(true);
          setIsConnectorModalVisible(true);
          return;
        }

        const provider =
          apiProvider ??
          ((connectors?.find((c) => c.id === connectorId) as ActionConnectorProps<Config, unknown>)
            ?.config.apiProvider as OpenAiProviderType);

        if (selectedConversation != null) {
          setApiConfig({
            conversationId: selectedConversation.id,
            apiConfig: {
              ...selectedConversation.apiConfig,
              connectorId,
              provider,
            },
          });
        }

        onConnectorSelectionChange(connectorId, provider);
      },
      [
        connectors,
        selectedConversation,
        onConnectorSelectionChange,
        onConnectorModalVisibilityChange,
        setApiConfig,
      ]
    );

    const placeholderComponent = useMemo(
      () => (
        <EuiText color="default" size={'xs'}>
          {i18n.INLINE_CONNECTOR_PLACEHOLDER}
        </EuiText>
      ),
      []
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
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.INLINE_CONNECTOR_LABEL}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          {isOpen ? (
            <EuiSuperSelect
              aria-label={i18n.CONNECTOR_SELECTOR_TITLE}
              compressed={true}
              disabled={isDisabled}
              hasDividers={true}
              isLoading={isLoading}
              isOpen={isOpen}
              onBlur={handleOnBlur}
              onChange={onChange}
              options={[...connectorOptions, addNewConnectorOption]}
              placeholder={placeholderComponent}
              valueOfSelected={selectedConnectorId}
            />
          ) : (
            <span>
              <EuiButtonEmpty
                className={placeholderButtonClassName}
                color={'text'}
                data-test-subj="connectorSelectorPlaceholderButton"
                iconSide={'right'}
                iconType="arrowDown"
                isDisabled={isDisabled}
                onClick={onConnectorClick}
                size="xs"
              >
                {selectedConnectorName}
              </EuiButtonEmpty>
            </span>
          )}
          {isConnectorModalVisible && (
            <ConnectorAddModal
              actionType={actionType}
              onClose={cleanupAndCloseModal}
              postSaveEventHandler={(savedAction: ActionConnector) => {
                const provider = (savedAction as ActionConnectorProps<Config, unknown>)?.config
                  .apiProvider as OpenAiProviderType;
                onChange(savedAction.id, provider);
                onConnectorSelectionChange(savedAction.id, provider);
                refetchConnectors?.();
                cleanupAndCloseModal();
              }}
              actionTypeRegistry={actionTypeRegistry}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConnectorSelectorInline.displayName = 'ConnectorSelectorInline';
