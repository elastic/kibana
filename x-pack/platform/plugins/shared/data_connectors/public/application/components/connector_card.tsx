/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiPanel, EuiText } from '@elastic/eui';
import type { Connector } from '../../types/connector';
import { getConnectorIcon } from '../../utils';

interface ConnectorCardProps {
  connector: Connector;
  onClick?: (connector: Connector) => void;
  isDisabled?: boolean;
}

const contentStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  gap: 16,
};

const textStyle = ({ euiTheme }: UseEuiTheme) => ({
  fontWeight: euiTheme.font.weight.semiBold,
  textAlign: 'center' as const,
});

const getPanelStyle =
  (isDisabled: boolean) =>
  ({ euiTheme }: UseEuiTheme) => ({
    height: 122,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    border: `1px solid ${euiTheme.colors.borderBasePlain}`,
    transition: 'all 0.2s ease',
    '&:hover': !isDisabled
      ? {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          transform: 'translateY(-2px)',
          borderColor: euiTheme.colors.primary,
        }
      : {},
  });

export const ConnectorCard: React.FC<ConnectorCardProps> = ({
  connector,
  onClick,
  isDisabled = false,
}) => {
  const iconComponent = useMemo(() => getConnectorIcon(connector, 'l'), [connector]);

  return (
    <EuiPanel
      css={getPanelStyle(isDisabled)}
      paddingSize="l"
      hasShadow={false}
      hasBorder={false}
      onClick={() => !isDisabled && onClick?.(connector)}
      data-test-subj={`connectorCard-${connector.id}`}
    >
      <div css={contentStyle}>
        {iconComponent}
        <EuiText css={textStyle} size="s">
          <span>{connector.name}</span>
        </EuiText>
      </div>
    </EuiPanel>
  );
};
