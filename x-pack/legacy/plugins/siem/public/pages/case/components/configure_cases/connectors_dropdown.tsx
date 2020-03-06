/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiIcon, EuiSuperSelect } from '@elastic/eui';
import styled from 'styled-components';

import { Connector } from '../../../../containers/case/types';
import * as i18n from './translations';

interface Props {
  connectors: Connector[];
  connectorSelectedId: string;
  isLoading: boolean;
  onChange: (id: string) => void;
}

const ICON_SIZE = 'm';

const EuiIconExtended = styled(EuiIcon)`
  margin-right: 13px;
`;

const noConnectorOption = {
  value: 'none',
  inputDisplay: (
    <>
      <EuiIconExtended type="minusInCircle" size={ICON_SIZE} />
      <span>{i18n.NO_CONNECTOR}</span>
    </>
  ),
  'data-test-subj': 'no-connector',
};

const ConnectorsDropdownComponent: React.FC<Props> = ({
  connectors,
  connectorSelectedId,
  isLoading,
  onChange,
}) => {
  const connectorsAsOptions = useMemo(
    () =>
      connectors.reduce(
        (acc, connector) => [
          ...acc,
          {
            value: connector.id,
            inputDisplay: (
              <>
                <EuiIconExtended type="logoWebhook" size={ICON_SIZE} />
                <span>{connector.name}</span>
              </>
            ),
            'data-test-subj': 'servicenow-connector',
          },
        ],
        [noConnectorOption]
      ),
    [connectors]
  );

  return (
    <EuiSuperSelect
      isLoading={isLoading}
      options={connectorsAsOptions}
      valueOfSelected={connectorSelectedId}
      fullWidth
      onChange={onChange}
    />
  );
};

export const ConnectorsDropdown = React.memo(ConnectorsDropdownComponent);
