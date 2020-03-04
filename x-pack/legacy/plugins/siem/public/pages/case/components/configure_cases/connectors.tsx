/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
} from '@elastic/eui';

import styled from 'styled-components';

import { ConnectorsDropdown } from './connectors_dropdown';
import * as i18n from './translations';
import { Connector } from '../../../../containers/case/types';

const ICON_SIZE = 'm';

const EuiIconExtended = styled(EuiIcon)`
  margin-right: 13px;
`;

const EuiFormRowExtended = styled(EuiFormRow)`
  .euiFormRow__labelWrapper {
    .euiFormRow__label {
      width: 100%;
    }
  }
`;

interface Props {
  connectors: Connector[];
}

const noConnectorOption = {
  value: 'no-connector',
  inputDisplay: (
    <>
      <EuiIconExtended type="minusInCircle" size={ICON_SIZE} />
      <span>{i18n.NO_CONNECTOR}</span>
    </>
  ),
  'data-test-subj': 'no-connector',
};

const ConnectorsComponent: React.FC<Props> = ({ connectors }) => {
  let connectorsAsOptions = useMemo(
    () =>
      connectors.map(c => ({
        value: c.id,
        inputDisplay: (
          <>
            <EuiIconExtended type="logoWebhook" size={ICON_SIZE} />
            <span>{c.name}</span>
          </>
        ),
        'data-test-subj': 'servicenow-connector',
      })),
    [connectors]
  );

  connectorsAsOptions = [noConnectorOption, ...connectorsAsOptions];

  const dropDownLabel = (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>{i18n.INCIDENT_MANAGEMENT_SYSTEM_LABEL}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink>{i18n.ADD_NEW_CONNECTOR}</EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{i18n.INCIDENT_MANAGEMENT_SYSTEM_TITLE}</h3>}
      description={i18n.INCIDENT_MANAGEMENT_SYSTEM_DESC}
    >
      <EuiFormRowExtended fullWidth label={dropDownLabel}>
        <ConnectorsDropdown connectors={connectorsAsOptions} />
      </EuiFormRowExtended>
    </EuiDescribedFormGroup>
  );
};

export const Connectors = React.memo(ConnectorsComponent);
