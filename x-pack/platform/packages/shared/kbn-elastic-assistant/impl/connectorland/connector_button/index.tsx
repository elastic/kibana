/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';

import { OpenAILogo } from '@kbn/stack-connectors-plugin/public/common';
import * as i18n from '../translations';
import { useAssistantContext } from '../../assistant_context';

export interface ConnectorButtonProps {
  setIsConnectorModalVisible?: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Simple button component for adding a connector. Note: component is basic and does not handle connector
 * add logic. See ConnectorSetup component if wanting to manage connector add logic.
 */
export const ConnectorButton: React.FC<ConnectorButtonProps> = React.memo<ConnectorButtonProps>(
  ({ setIsConnectorModalVisible }) => {
    const { assistantAvailability } = useAssistantContext();

    const title = assistantAvailability.hasConnectorsAllPrivilege
      ? i18n.ADD_CONNECTOR_TITLE
      : i18n.ADD_CONNECTOR_MISSING_PRIVILEGES_TITLE;
    const description = assistantAvailability.hasConnectorsAllPrivilege
      ? i18n.ADD_CONNECTOR_DESCRIPTION
      : i18n.ADD_CONNECTOR_MISSING_PRIVILEGES_DESCRIPTION;

    const onClick = useCallback(() => {
      setIsConnectorModalVisible?.(true);
    }, [setIsConnectorModalVisible]);

    return (
      <EuiFlexGroup gutterSize="l" justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiCard
            data-test-subj="connectorButton"
            layout="horizontal"
            icon={<EuiIcon size="xl" type={OpenAILogo} />}
            title={title}
            description={description}
            onClick={assistantAvailability.hasConnectorsAllPrivilege ? onClick : undefined}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
ConnectorButton.displayName = 'ConnectorButton';
