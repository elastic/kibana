/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiPanel, EuiText, EuiFlexGroup, EuiFlexItem, transparentize } from '@elastic/eui';
import type { Connector } from '../../types/connector';
import { getConnectorIcon } from '../../utils';

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
  const iconComponent = useMemo(
    () => getConnectorIcon(connector.iconType, 'l'),
    [connector.iconType]
  );

  return (
    <EuiPanel
      css={({ euiTheme }) => ({
        height: 110,
        padding: euiTheme.size.l,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
        borderRadius: euiTheme.border.radius.medium,
        transition: `all ${euiTheme.animation.fast} ease`,
        '&:hover': !isDisabled
          ? {
              boxShadow: `0 ${euiTheme.size.xs} ${euiTheme.size.base} ${transparentize(
                euiTheme.colors.shadow,
                0.1
              )}`,
              transform: `translateY(-${euiTheme.size.xs})`,
              borderColor: euiTheme.colors.primary,
            }
          : {},
      })}
      paddingSize="none"
      hasShadow={false}
      hasBorder={false}
      onClick={() => !isDisabled && onClick?.(connector)}
      data-test-subj={`connectorCard-${connector.id}`}
    >
      <EuiFlexGroup
        direction="column"
        alignItems="flexStart"
        justifyContent="center"
        gutterSize="m"
        css={css({ height: '100%' })}
      >
        <EuiFlexItem grow={false}>{iconComponent}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            css={({ euiTheme }) => ({
              fontWeight: euiTheme.font.weight.semiBold,
            })}
            size="s"
          >
            <span>{connector.name}</span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
