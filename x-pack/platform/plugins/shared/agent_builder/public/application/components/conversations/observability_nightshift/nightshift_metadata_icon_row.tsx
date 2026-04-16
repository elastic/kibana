/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiAvatarProps } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export interface NightshiftMetadataIconItemProps {
  title: string;
  iconType: NonNullable<EuiAvatarProps['iconType']>;
  value: React.ReactNode;
  /** Background fill for the icon avatar (see {@link https://eui.elastic.co/docs/components/display/avatar/#icons EuiAvatar icons}). */
  color?: EuiAvatarProps['color'];
  /** Icon glyph color; contrasts with `color` when set. */
  iconColor?: EuiAvatarProps['iconColor'];
}

export const NightshiftMetadataIconCard: React.FC<NightshiftMetadataIconItemProps> = ({
  title,
  iconType,
  value,
  color,
  iconColor,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar
            type="space"
            size="s"
            name={title}
            iconType={iconType}
            color={color ?? euiTheme.colors.backgroundBaseSubdued}
            iconColor={iconColor}
            aria-hidden={true}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiTitle size="xxxs">
            <p>{title}</p>
          </EuiTitle>
          <EuiText size="xs" css={css({ marginTop: euiTheme.size.xs })}>
            {value}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
