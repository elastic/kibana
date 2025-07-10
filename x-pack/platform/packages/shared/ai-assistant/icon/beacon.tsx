/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiIconProps, EuiThemeComputed } from '@elastic/eui';

import { AssistantIcon } from './icon';
import { useStyles } from './beacon.styles';

type Size = keyof EuiThemeComputed['size'] & EuiIconProps['size'];

/**
 * Parameters for the styles for the AI Assistant beacon.
 */
export interface AssistantBeaconProps {
  /**
   * Background color for the beacon.
   */
  backgroundColor?: keyof EuiThemeComputed['colors'];
  /**
   * Size of the beacon.
   */
  size?: Size;

  /**
   * Color of the rings around the icon.
   */
  ringsColor?: string;
}

/**
 * An AI Assistant icon with a pulsing ring around it, used in "hero" areas promoting functionality or prompting interaction.
 */
export const AssistantBeacon = ({
  backgroundColor,
  size = 'xxl',
  ringsColor,
}: AssistantBeaconProps) => {
  const { root, rings } = useStyles({ backgroundColor, size, ringsColor });

  return (
    <div css={root}>
      <AssistantIcon {...{ size }} />
      <span css={rings} />
    </div>
  );
};
