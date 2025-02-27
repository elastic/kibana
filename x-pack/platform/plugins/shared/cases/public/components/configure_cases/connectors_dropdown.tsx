/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiSuperSelect,
  useEuiTheme,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { ActionConnector } from '../../containers/configure/types';
import * as i18n from './translations';
import { useKibana } from '../../common/lib/kibana';
import { getConnectorIcon, isDeprecatedConnector } from '../utils';

export interface Props {
  connectors: ActionConnector[];
  disabled: boolean;
  isLoading: boolean;
  onChange: (id: string) => void;
  selectedConnector: string;
}

const suspendedComponentWithProps = (ComponentToSuspend: React.ComponentType) => {
  // eslint-disable-next-line react/display-name
  return (props: Record<string, unknown>) => (
    <Suspense fallback={<EuiLoadingSpinner size={'m'} />}>
      <ComponentToSuspend {...props} />
    </Suspense>
  );
};

const ICON_SIZE = 'm';

const noConnectorOption = {
  value: 'none',
  inputDisplay: (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon
          css={css`
            margin-right: 13px;
            margin-bottom: 0 !important;
          `}
          type="minusInCircle"
          size={ICON_SIZE}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <span data-test-subj={`dropdown-connector-no-connector`}>{i18n.NO_CONNECTOR}</span>
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
  'data-test-subj': 'dropdown-connector-no-connector',
};

const ConnectorsDropdownComponent: React.FC<Props> = ({
  connectors,
  disabled,
  isLoading,
  onChange,
  selectedConnector,
}) => {
  const { triggersActionsUi } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const connectorsAsOptions = useMemo(() => {
    const connectorsFormatted = connectors.reduce(
      (acc, connector) => {
        const iconClass = getConnectorIcon(triggersActionsUi, connector.actionTypeId);

        return [
          ...acc,
          {
            value: connector.id,
            inputDisplay: (
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    css={css`
                      margin-right: ${euiTheme.size.m};
                      margin-bottom: 0 !important;
                    `}
                    type={
                      typeof iconClass === 'string'
                        ? iconClass
                        : suspendedComponentWithProps(iconClass)
                    }
                    size={ICON_SIZE}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <span>
                    {connector.name}
                    {isDeprecatedConnector(connector) && ` (${i18n.DEPRECATED_TOOLTIP_TEXT})`}
                  </span>
                </EuiFlexItem>
                {isDeprecatedConnector(connector) && (
                  <EuiFlexItem grow={false}>
                    <EuiIconTip
                      css={css`
                        margin-left: ${euiTheme.size.s}
                        margin-bottom: 0 !important;
                      `}
                      aria-label={i18n.DEPRECATED_TOOLTIP_CONTENT}
                      size={ICON_SIZE}
                      type="warning"
                      color="warning"
                      content={i18n.DEPRECATED_TOOLTIP_CONTENT}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            ),
            'data-test-subj': `dropdown-connector-${connector.id}`,
          },
        ];
      },
      [noConnectorOption]
    );

    return connectorsFormatted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors]);

  return (
    <EuiSuperSelect
      aria-label={i18n.INCIDENT_MANAGEMENT_SYSTEM_LABEL}
      data-test-subj="dropdown-connectors"
      disabled={disabled}
      fullWidth
      isLoading={isLoading}
      onChange={onChange}
      options={connectorsAsOptions}
      valueOfSelected={selectedConnector}
    />
  );
};
ConnectorsDropdownComponent.displayName = 'ConnectorsDropdown';

export const ConnectorsDropdown = React.memo(ConnectorsDropdownComponent);
