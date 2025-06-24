/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSuperSelect,
  EuiText,
  EuiTextTruncate,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';

type ConnectorSelectorBaseProps = UseGenAIConnectorsResult;

const wrapperClassName = css`
  height: 32px;

  .euiSuperSelectControl {
    border: none;
    box-shadow: none;
    background: none;
    padding-left: 0;
  }
`;

const smallFontClassName = css`
  font-size: 12px;
`;

export function ConnectorSelectorBase(props: ConnectorSelectorBaseProps) {
  if (props.loading) {
    return (
      <EuiFlexGroup alignItems="center" className={wrapperClassName}>
        <EuiFlexItem>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (props.error) {
    return (
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="s" className={wrapperClassName}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="warning" color="danger" size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="danger">
            {i18n.translate('xpack.observabilityAiAssistant.connectorSelector.error', {
              defaultMessage: 'Failed to load connectors',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!props.connectors?.length) {
    return (
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="s" className={wrapperClassName}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="warning">
            {i18n.translate('xpack.observabilityAiAssistant.connectorSelector.empty', {
              defaultMessage: 'No connectors',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      className={wrapperClassName}
      direction="row"
      alignItems="center"
      gutterSize="xs"
      responsive={false}
    >
      <EuiFlexItem grow>
        <EuiSuperSelect
          compressed
          valueOfSelected={props.selectedConnector}
          options={props.connectors.map((connector) => ({
            value: connector.id,
            inputDisplay: (
              <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.observabilityAiAssistant.connectorSelector.connectorSelectLabel',
                      {
                        defaultMessage: 'Connector:',
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow>
                  <EuiTextTruncate
                    text={connector.name}
                    className={smallFontClassName}
                    truncation="end"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            dropdownDisplay: <EuiText size="xs">{connector.name}</EuiText>,
          }))}
          onChange={(id) => {
            props.selectConnector(id);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
