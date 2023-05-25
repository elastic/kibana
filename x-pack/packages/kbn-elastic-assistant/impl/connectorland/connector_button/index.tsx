/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { ConnectorAddModal } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { HttpSetup } from '@kbn/core-http-browser';
import { GEN_AI_CONNECTOR_ID, GenAiLogo } from '@kbn/stack-connectors-plugin/public/common';
import { useLoadActionTypes } from '../use_load_action_types';
import * as i18n from '../translations';

export interface ConnectorButtonProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  http: HttpSetup;
  refetchConnectors?: () => void;
  connectorAdded?: boolean;
}

export const ConnectorButton: React.FC<ConnectorButtonProps> = React.memo<ConnectorButtonProps>(
  ({ actionTypeRegistry, http, refetchConnectors, connectorAdded = false }) => {
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

    return (
      <>
        {isConnectorModalVisible && (
          <ConnectorAddModal
            actionType={actionType}
            onClose={() => setIsConnectorModalVisible(false)}
            postSaveEventHandler={(savedAction: ActionConnector) => {
              refetchConnectors?.();
              setIsConnectorModalVisible(false);
            }}
            actionTypeRegistry={actionTypeRegistry}
          />
        )}
        <EuiFlexGroup gutterSize="l" justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiCard
              layout="horizontal"
              icon={<EuiIcon size="xl" type={GenAiLogo} />}
              title={connectorAdded ? i18n.CONNECTOR_ADDED_TITLE : i18n.ADD_CONNECTOR_TITLE}
              isDisabled={connectorAdded}
              description={
                connectorAdded ? i18n.CONNECTOR_ADDED_DESCRIPTION : i18n.ADD_CONNECTOR_DESCRIPTION
              }
              onClick={() => setIsConnectorModalVisible(true)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);
ConnectorButton.displayName = 'ConnectorButton';
