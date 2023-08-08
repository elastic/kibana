/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';

import { GenAiLogo } from '@kbn/stack-connectors-plugin/public/common';
import * as i18n from '../translations';

export interface ConnectorButtonProps {
  setIsConnectorModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Simple button component for adding a connector. Note: component is basic and does not handle connector
 * add logic. Must pass in `setIsConnectorModalVisible`, see ConnectorSetup component if wanting to manage
 * connector add logic.
 */
export const ConnectorButton: React.FC<ConnectorButtonProps> = React.memo<ConnectorButtonProps>(
  ({ setIsConnectorModalVisible }) => {
    return (
      <EuiFlexGroup gutterSize="l" justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiCard
            layout="horizontal"
            icon={<EuiIcon size="xl" type={GenAiLogo} />}
            title={i18n.ADD_CONNECTOR_TITLE}
            description={i18n.ADD_CONNECTOR_DESCRIPTION}
            onClick={() => setIsConnectorModalVisible(true)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
ConnectorButton.displayName = 'ConnectorButton';
