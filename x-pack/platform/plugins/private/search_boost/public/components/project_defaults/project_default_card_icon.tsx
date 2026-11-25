/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiPanel, useEuiTheme } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

import type { BoostProfileType } from '../../../common/types';

const TYPE_ICONS: Readonly<Record<BoostProfileType, string>> = {
  indices: 'table',
  data_streams: 'productStreamsClassic',
};

const getIconStyles = ({ size }: EuiThemeComputed) => css`
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: ${size.xxxxl};
  block-size: ${size.xxxxl};
`;

export interface ProjectDefaultCardIconProps {
  type: BoostProfileType;
}

export const ProjectDefaultCardIcon = ({ type }: ProjectDefaultCardIconProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      color="subdued"
      hasShadow={false}
      grow={false}
      paddingSize="none"
      css={getIconStyles(euiTheme)}
      aria-hidden={true}
    >
      <EuiIcon type={TYPE_ICONS[type]} size="xl" aria-hidden={true} />
    </EuiPanel>
  );
};
