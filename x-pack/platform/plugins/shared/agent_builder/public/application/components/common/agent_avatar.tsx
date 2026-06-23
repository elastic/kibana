/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiAvatar, EuiIcon, EuiPanel, useEuiTheme } from '@elastic/eui';
import type { EuiAvatarProps, EuiPanelProps } from '@elastic/eui';
import { agentBuilderDefaultAgentId, type AgentDefinition } from '@kbn/agent-builder-common';
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
  /** Size that will be used if the avatar is rendered as an icon. By default uses 1 size larger than `size` prop. */
  iconSize?: EuiAvatarProps['size'];
  size: EuiAvatarProps['size'];
  shape?: 'circle' | 'square';
}

interface AgentAvatarWithAgentProps extends BaseAgentAvatarProps {
  agent: AgentDefinition;
  iconPaddingSize?: EuiPanelProps['paddingSize'];
  name?: never;
  symbol?: never;
  color?: 'subdued' | AgentDefinition['avatar_color'];
}

interface AgentAvatarCustomProps extends BaseAgentAvatarProps {
  agent?: never;
  agentId?: string;
  name: AgentDefinition['name'];
  symbol: AgentDefinition['avatar_symbol'];
  color: 'subdued' | AgentDefinition['avatar_color'];
}

type AgentAvatarProps = AgentAvatarWithAgentProps | AgentAvatarCustomProps;

export const AgentAvatar: React.FC<AgentAvatarProps> = (props) => {
  const { iconSize: iconSizeProp, size, shape = 'circle' } = props;

  const {
    name,
    symbol,
    color: colorProp,
    readonly,
    icon,
    agentId,
    iconPaddingSize,
  } = 'agent' in props && props.agent
    ? {
        name: props.agent.name,
        symbol: props.agent.avatar_symbol,
        // Agent color takes priority over the prop override
        color: props.agent.avatar_color ?? props.color,
        readonly: props.agent.readonly,
        icon: props.agent.avatar_icon,
        agentId: props.agent.id,
        iconPaddingSize: props.iconPaddingSize ?? 'xs',
      }
    : {
        agentId: props.agentId,
        name: props.name,
        symbol: props.symbol,
        color: props.color,
        readonly: false,
      };

  const { euiTheme } = useEuiTheme();
  const color = colorProp === 'subdued' ? euiTheme.colors.backgroundBaseSubdued : colorProp;
  const hasBackground = Boolean(color);
  const isBuiltIn = readonly;
  const isDefaultAgent = agentId === agentBuilderDefaultAgentId;
  const shouldUseIcon = !symbol && (isBuiltIn || isDefaultAgent || Boolean(icon));

  const borderAndShapeStyles = css`
    line-height: 1;
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
    ${shape === 'circle' ? 'border-radius: 50%;' : roundedBorderRadiusStyles}
  `;

  if (shouldUseIcon) {
    const iconType = icon ?? 'logoElastic';
    const iconSize = iconSizeProp || getIconSize({ size });
    const panelStyles = css`
      ${hasBackground ? `background-color: ${color};` : ''}
      ${borderAndShapeStyles}
    `;
    return (
      <EuiPanel hasBorder={false} hasShadow={false} css={panelStyles} paddingSize={iconPaddingSize}>
        <EuiIcon type={iconType} size={iconSize} aria-hidden={true} />
      </EuiPanel>
    );
  }

  let type: 'user' | 'space' | undefined;
  if (shape === 'circle') {
    type = 'user';
  } else if (shape === 'square') {
    type = 'space';
  }
  return (
    <EuiAvatar
      size={size}
      name={name}
      initials={symbol}
      type={type}
      color={color}
      css={borderAndShapeStyles}
    />
  );
};
