/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiSuperSelect, EuiText } from '@elastic/eui';
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
import { css } from '@emotion/react';
import { Conversation } from '../../assistant_context/types';
import { useLoadConnectors } from '../use_load_connectors';
import { useConversation } from '../../assistant/use_conversation';
import * as i18n from '../translations';
import { useLoadActionTypes } from '../use_load_action_types';

export const ADD_NEW_CONNECTOR = 'ADD_NEW_CONNECTOR';
interface Props {
  actionTypeRegistry: ActionTypeRegistryContract;
  conversation: Conversation;
  http: HttpSetup;
  onConnectorModalVisibilityChange?: (isVisible: boolean) => void;
}

interface Config {
  apiProvider: string;
}

export const ConnectorSelector: React.FC<Props> = React.memo(
  ({ actionTypeRegistry, conversation, http, onConnectorModalVisibilityChange }) => {
    const { setApiConfig } = useConversation();

    // Connector Modal State
    const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
    const { data: actionTypes } = useLoadActionTypes({ http });
    const actionType = actionTypes?.find((at) => at.id === GEN_AI_CONNECTOR_ID) ?? {
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'platinum',
      supportedFeatureIds: ['general'],
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

    const addNewConnectorOption = useMemo(() => {
      return {
        value: ADD_NEW_CONNECTOR,
        inputDisplay: i18n.ADD_NEW_CONNECTOR,
        dropdownDisplay: (
          <React.Fragment key={ADD_NEW_CONNECTOR}>
            <EuiButtonEmpty
              iconType="plus"
              size="xs"
              css={css`
                width: 100%;
              `}
            >
              {i18n.ADD_NEW_CONNECTOR}
            </EuiButtonEmpty>
          </React.Fragment>
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
        setApiConfig({
          conversationId: conversation.id,
          apiConfig: {
            ...conversation.apiConfig,
            connectorId,
            provider: apiProvider,
          },
        });
      },
      [
        connectors,
        conversation.apiConfig,
        conversation.id,
        setApiConfig,
        onConnectorModalVisibilityChange,
      ]
    );

    return (
      <>
        <EuiSuperSelect
          options={[...connectorOptions, addNewConnectorOption]}
          valueOfSelected={conversation.apiConfig.connectorId ?? ''}
          onChange={onChange}
          compressed={true}
          isLoading={isLoading}
          aria-label={i18n.CONNECTOR_SELECTOR_TITLE}
        />
        {isConnectorModalVisible && (
          <ConnectorAddModal
            actionType={actionType}
            onClose={cleanupAndCloseModal}
            postSaveEventHandler={(savedAction: ActionConnector) => {
              setApiConfig({
                conversationId: conversation.id,
                apiConfig: {
                  ...conversation.apiConfig,
                  connectorId: savedAction.id,
                  provider: (savedAction as ActionConnectorProps<Config, unknown>)?.config
                    .apiProvider as OpenAiProviderType,
                },
              });
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
