/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSuperSelect, EuiIcon, EuiSuperSelectOption } from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from '../translations';

const ICON_SIZE = 'm';

const EuiIconExtended = styled(EuiIcon)`
  margin-right: 13px;
`;

const ConnectorsDropdownComponent: React.FC = () => {
  const connectors: Array<EuiSuperSelectOption<string>> = [
    {
      value: 'no-connector',
      inputDisplay: (
        <>
          <EuiIconExtended type="minusInCircle" size={ICON_SIZE} />
          <span>{i18n.NO_CONNECTOR}</span>
        </>
      ),
      'data-test-subj': 'my-servicenow-connector',
      disabled: false,
    },
    {
      value: 'my-servicenow-connector',
      inputDisplay: (
        <>
          <EuiIconExtended type="logoWebhook" size={ICON_SIZE} />
          <span>{'My ServiceNow connector'}</span>
        </>
      ),
      'data-test-subj': 'my-servicenow-connector',
      disabled: false,
    },
  ];
  return <EuiSuperSelect options={connectors} valueOfSelected={'no-connector'} fullWidth />;
};

export const ConnectorsDropdown = React.memo(ConnectorsDropdownComponent);
