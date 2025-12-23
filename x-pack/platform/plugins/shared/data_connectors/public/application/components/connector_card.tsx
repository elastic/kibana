/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import { EuiPanel, EuiIcon, EuiText } from '@elastic/eui';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import type { Connector } from '../../types/connector';

interface ConnectorCardProps {
  connector: Connector;
  onClick?: (connector: Connector) => void;
  isDisabled?: boolean;
}

export const ConnectorCard: React.FC<ConnectorCardProps> = ({
  connector,
  onClick,
  isDisabled = false,
}) => {
  // Resolve icon at render time to properly handle lazy components, require clean up later
  const iconComponent = useMemo(() => {
    if (connector.connectorSpecId) {
      const LazyIcon = ConnectorIconsMap.get(connector.connectorSpecId);
      if (LazyIcon) {
        return (
          <Suspense fallback={<EuiIcon type="application" size="l" />}>
            <LazyIcon size="l" />
          </Suspense>
        );
      }
    }

    if (connector.icon) {
      return <EuiIcon type={connector.icon} size="l" />;
    }
  }, [connector.connectorSpecId, connector.icon]);

  return (
    <EuiPanel
      css={({ euiTheme }) => ({
        height: '122px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        border: `1px solid ${euiTheme.colors.borderBasePlain}`,
        transition: 'all 0.2s ease',
        '&:hover': isDisabled
          ? {}
          : {
              boxShadow: `0 2px 8px rgba(0, 0, 0, 0.1)`,
              transform: 'translateY(-2px)',
              borderColor: euiTheme.colors.primary,
            },
      })}
      paddingSize="l"
      hasShadow={false}
      hasBorder={false}
      onClick={() => !isDisabled && onClick?.(connector)}
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
        {iconComponent}
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
