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

import { Connector } from '../../../../containers/case/configure/types';

const EuiFormRowExtended = styled(EuiFormRow)`
  .euiFormRow__labelWrapper {
    .euiFormRow__label {
      width: 100%;
    }
  }
`;

interface Props {
  connectors: Connector[];
  disabled: boolean;
  isLoading: boolean;
  onChangeConnector: (id: string) => void;
  selectedConnector: string;
  handleShowFlyout: () => void;
}
const ConnectorsComponent: React.FC<Props> = ({
  connectors,
  disabled,
  isLoading,
  onChangeConnector,
  selectedConnector,
  handleShowFlyout,
}) => {
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
            disabled={disabled}
            selectedConnector={selectedConnector}
            isLoading={isLoading}
            onChange={onChangeConnector}
          />
        </EuiFormRowExtended>
      </EuiDescribedFormGroup>
    </>
  );
};

export const Connectors = React.memo(ConnectorsComponent);
