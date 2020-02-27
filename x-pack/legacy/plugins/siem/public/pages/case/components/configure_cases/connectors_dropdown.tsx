/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiSuperSelect, EuiSuperSelectOption } from '@elastic/eui';

interface Props {
  connectors: Array<EuiSuperSelectOption<string>>;
}

import { connectors as connectorsDefinition } from '../../../../lib/connectors/config';

const ICON_SIZE = 'm';
const serviceNowDefinition = connectorsDefinition.get('.servicenow')!;

const EuiIconExtended = styled(EuiIcon)`
  margin-right: 13px;
`;

const connectors: Array<EuiSuperSelectOption<string>> = [
  {
    value: 'no-connector',
    inputDisplay: (
      <>
        <EuiIconExtended type="minusInCircle" size={ICON_SIZE} />
        <span>{i18n.NO_CONNECTOR}</span>
      </>
    ),
    'data-test-subj': 'no-connector',
  },
  {
    value: 'servicenow-connector',
    inputDisplay: (
      <>
        <EuiIconExtended type={serviceNowDefinition.logo} size={ICON_SIZE} />
        <span>{'My ServiceNow connector'}</span>
      </>
    ),
    'data-test-subj': 'servicenow-connector',
  },
];

const ConnectorsDropdownComponent: React.FC = () => {
  const [selectedConnector, setSelectedConnector] = useState(connectors[0].value);

  return (
    <EuiSuperSelect
      options={connectors}
      valueOfSelected={selectedConnector}
      fullWidth
      onChange={setSelectedConnector}
    />
  );
};

export const ConnectorsDropdown = React.memo(ConnectorsDropdownComponent);
