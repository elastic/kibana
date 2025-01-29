/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  useEuiTheme,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiRadio,
  EuiFormFieldset,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibana } from '../../../../../common/hooks/use_kibana';
import type { AIConnector } from '../../types';

const useRowCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    &.euiPanel:hover,
    &.euiPanel:focus {
      box-shadow: none;
      transform: none;
    }
    &.euiPanel:hover {
      background-color: ${euiTheme.colors.lightestShade};
    }
    .euiRadio {
      color: ${euiTheme.colors.textPrimary};
      label.euiRadio__label {
        padding-left: ${euiTheme.size.xl} !important;
      }
    }
  `;
};

interface ConnectorSelectorProps {
  connectors: AIConnector[];
  selectedConnectorId: string | undefined;
  setConnector: (connector: AIConnector | undefined) => void;
}
export const ConnectorSelector = React.memo<ConnectorSelectorProps>(
  ({ connectors, setConnector, selectedConnectorId }) => {
    const {
      triggersActionsUi: { actionTypeRegistry },
    } = useKibana().services;
    const rowCss = useRowCss();
    return (
      <EuiFormFieldset>
        <EuiFlexGroup
          alignItems="stretch"
          direction="column"
          gutterSize="s"
          data-test-subj="connectorSelector"
        >
          {connectors.map((connector) => (
            <EuiFlexItem key={connector.id}>
              <EuiPanel
                element="button"
                type="button" // So that the enter button will not submit the form.
                role="radio"
                key={connector.id}
                onClick={() => setConnector(connector)}
                hasShadow={false}
                hasBorder
                paddingSize="l"
                css={rowCss}
                data-test-subj={`connectorSelector-${connector.id}`}
              >
                <EuiFlexGroup direction="row" alignItems="center" justifyContent="spaceBetween">
                  <EuiFlexItem>
                    <EuiRadio
                      label={connector.name}
                      id={connector.id}
                      value={connector.id}
                      checked={selectedConnectorId === connector.id}
                      onChange={() => setConnector(connector)}
                      data-test-subj={`connectorSelectorRadio-${connector.id}${
                        selectedConnectorId === connector.id ? '-selected' : ''
                      }`}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">
                      {actionTypeRegistry.get(connector.actionTypeId).actionTypeTitle}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFormFieldset>
    );
  }
);
ConnectorSelector.displayName = 'ConnectorSelector';
