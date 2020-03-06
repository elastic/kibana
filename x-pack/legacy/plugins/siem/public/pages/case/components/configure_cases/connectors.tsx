/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';

import styled from 'styled-components';

import { ConnectorsDropdown } from './connectors_dropdown';
import * as i18n from './translations';
import { Connector } from '../../../../containers/case/types';

const ICON_SIZE = 'm';

const EuiIconExtended = styled(EuiIcon)`
  margin-right: 13px;
`;

import {
  ActionsConnectorsContextProvider,
  ConnectorAddFlyout,
} from '../../../../../../../../plugins/triggers_actions_ui/public';
import { useKibana } from '../../../../lib/kibana';

const EuiFormRowExtended = styled(EuiFormRow)`
  .euiFormRow__labelWrapper {
    .euiFormRow__label {
      width: 100%;
    }
  }
`;

interface Props {
  connectors: Connector[];
  isLoading: boolean;
  refetchConnectors: () => void;
}
const actionTypes = [
  {
    id: '.servicenow',
    name: 'ServiceNow',
    enabled: true,
  },
];

const ConnectorsComponent: React.FC<Props> = ({ connectors, isLoading, refetchConnectors }) => {
  const { http, triggers_actions_ui, notifications, application } = useKibana().services;
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);

  const handleShowFlyout = useCallback(() => setAddFlyoutVisibility(true), []);

  const dropDownLabel = (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>{i18n.INCIDENT_MANAGEMENT_SYSTEM_LABEL}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink onClick={handleShowFlyout}>{i18n.ADD_NEW_CONNECTOR}</EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      <EuiDescribedFormGroup
        fullWidth
        title={<h3>{i18n.INCIDENT_MANAGEMENT_SYSTEM_TITLE}</h3>}
        description={i18n.INCIDENT_MANAGEMENT_SYSTEM_DESC}
      >
        <EuiFormRowExtended fullWidth label={dropDownLabel}>
          <ConnectorsDropdown
            connectors={connectors}
            connectorSelectedId={'none'}
            isLoading={isLoading}
            onChange={(id: string) => {
              console.log(id);
            }}
          />
        </EuiFormRowExtended>
      </EuiDescribedFormGroup>
      <ActionsConnectorsContextProvider
        value={{
          http,
          actionTypeRegistry: triggers_actions_ui.actionTypeRegistry,
          toastNotifications: notifications.toasts,
          capabilities: application.capabilities,
          reloadConnectors: refetchConnectors as () => Promise<void>,
        }}
      >
        <ConnectorAddFlyout
          addFlyoutVisible={addFlyoutVisible}
          setAddFlyoutVisibility={setAddFlyoutVisibility}
          actionTypes={actionTypes}
        />
      </ActionsConnectorsContextProvider>
    </>
  );
};

export const Connectors = React.memo(ConnectorsComponent);
