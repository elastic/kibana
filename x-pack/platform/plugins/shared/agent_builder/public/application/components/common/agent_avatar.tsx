/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiAvatar, EuiIcon, EuiPanel, useEuiTheme } from '@elastic/eui';
import type { EuiAvatarProps } from '@elastic/eui';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { css } from '@emotion/react';
import { roundedBorderRadiusStyles } from '../../../common.styles';

// Icon size should be one size larger than the avatar size
const getIconSize = ({ size }: { size: 's' | 'm' | 'l' | 'xl' | undefined }) => {
  switch (size) {
    case 's':
      return 'm';
    case 'm':
      return 'l';
    case 'l':
      return 'xl';
    case 'xl':
      return 'xxl';
    default:
      return undefined;
  }
};

interface BaseAgentAvatarProps {
  size: EuiAvatarProps['size'];
  shape?: 'circle' | 'square';
}

interface AgentAvatarWithAgentProps extends BaseAgentAvatarProps {
  agent: AgentDefinition;
  name?: never;
  symbol?: never;
  color?: 'subdued' | AgentDefinition['avatar_color'];
}

interface AgentAvatarCustomProps extends BaseAgentAvatarProps {
  agent?: never;
  name: AgentDefinition['name'];
  symbol: AgentDefinition['avatar_symbol'];
  color: 'subdued' | AgentDefinition['avatar_color'];
}

type AgentAvatarProps = AgentAvatarWithAgentProps | AgentAvatarCustomProps;

export const AgentAvatar: React.FC<AgentAvatarProps> = (props) => {
  const { size, shape = 'circle' } = props;

  const {
    name,
    symbol,
    color: colorProp,
    readonly,
    icon,
  } = 'agent' in props && props.agent
    ? {
        name: props.agent.name,
        symbol: props.agent.avatar_symbol,
        // Agent color can be overriden
        color: props.color ?? props.agent.avatar_color,
        readonly: props.agent.readonly,
        icon: props.agent.avatar_icon,
      }
    : { name: props.name, symbol: props.symbol, color: props.color, readonly: false };

  const { euiTheme } = useEuiTheme();
  const color = colorProp === 'subdued' ? euiTheme.colors.backgroundBaseSubdued : colorProp;
  const hasBackground = Boolean(color);
  const isBuiltIn = readonly;
  const shouldUseIcon = isBuiltIn && !symbol;

  if (shouldUseIcon) {
    const iconType = icon ?? 'logoElastic';
    const iconSize = getIconSize({ size });
    if (hasBackground) {
      const panelStyles = css`
        background-color: ${color};
        ${roundedBorderRadiusStyles}
      `;
      return (
        <EuiPanel hasBorder={false} hasShadow={false} css={panelStyles} paddingSize="xs">
          <EuiIcon type={iconType} size={iconSize} />
        </EuiPanel>
      );
    }
    return <EuiIcon type={iconType} size={iconSize} />;
  }

  let type: 'user' | 'space' | undefined;
  if (shape === 'circle') {
    type = 'user';
  } else if (shape === 'square') {
    type = 'space';
  }
  const avatarStyles = shape === 'square' && roundedBorderRadiusStyles;
  return (
    <EuiAvatar
      size={size}
      name={name}
      initials={symbol}
      type={type}
      color={color}
      css={avatarStyles}
    />
  );
};
