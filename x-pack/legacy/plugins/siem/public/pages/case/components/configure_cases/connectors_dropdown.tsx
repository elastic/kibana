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

const ConnectorsDropdownComponent: React.FC<Props> = ({ connectors }) => {
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
