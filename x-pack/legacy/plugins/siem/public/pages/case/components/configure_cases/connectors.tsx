/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

import { ConnectorsDropdown } from './connectors_dropdown';
import * as i18n from './translations';

const ConnectorsComponent: React.FC = () => {
  const dropDownLabel = <div>{i18n.INCIDENT_MANAGEMENT_SYSTEM_LABEL}</div>;

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{i18n.INCIDENT_MANAGEMENT_SYSTEM_TITLE}</h3>}
      description={i18n.INCIDENT_MANAGEMENT_SYSTEM_DESC}
    >
      <EuiFormRow fullWidth label={dropDownLabel}>
        <ConnectorsDropdown />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};

export const Connectors = React.memo(ConnectorsComponent);
