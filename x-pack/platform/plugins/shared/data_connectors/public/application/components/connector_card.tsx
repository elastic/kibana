/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiIcon, EuiText } from '@elastic/eui';
import type { Connector } from '../../types/connector';

interface ConnectorCardProps {
  connector: Connector;
  onClick?: (connector: Connector) => void;
}

export const ConnectorCard: React.FC<ConnectorCardProps> = ({ connector, onClick }) => {
  return (
    <EuiPanel
      css={({ euiTheme }) => ({
        height: '122px',
        cursor: 'pointer',
        border: `1px solid ${euiTheme.colors.borderBasePlain}`,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: `0 2px 8px rgba(0, 0, 0, 0.1)`,
          transform: 'translateY(-2px)',
          borderColor: euiTheme.colors.primary,
        },
      })}
      paddingSize="l"
      hasShadow={false}
      hasBorder={false}
      onClick={() => onClick?.(connector)}
      data-test-subj={`connectorCard-${connector.id}`}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '16px',
        }}
      >
        <EuiIcon type={connector.icon} size="l" />
        <EuiText
          css={({ euiTheme }) => ({
            fontWeight: euiTheme.font.weight.semiBold,
            textAlign: 'center',
          })}
          size="s"
        >
          <span>{connector.name}</span>
        </EuiText>
      </div>
    </EuiPanel>
  );
};
