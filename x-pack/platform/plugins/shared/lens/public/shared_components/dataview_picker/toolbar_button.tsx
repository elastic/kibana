/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './toolbar_button.scss';
import React from 'react';
import classNames from 'classnames';
import { EuiButton, PropsOf, EuiButtonProps } from '@elastic/eui';

const groupPositionToClassMap = {
  none: null,
  left: 'kbnToolbarButton--groupLeft',
  center: 'kbnToolbarButton--groupCenter',
  right: 'kbnToolbarButton--groupRight',
};

type ButtonPositions = keyof typeof groupPositionToClassMap;
export const POSITIONS = Object.keys(groupPositionToClassMap) as ButtonPositions[];

type Weights = 'normal' | 'bold';
export const WEIGHTS = ['normal', 'bold'] as Weights[];

export const TOOLBAR_BUTTON_SIZES: Array<EuiButtonProps['size']> = ['s', 'm'];

export type ToolbarButtonProps = PropsOf<typeof EuiButton> & {
  /**
   * Determines prominence
   */
  fontWeight?: Weights;
  /**
   * Smaller buttons also remove extra shadow for less prominence
   */
  size?: EuiButtonProps['size'];
  /**
   * Determines if the button will have a down arrow or not
   */
  hasArrow?: boolean;
  /**
   * Adjusts the borders for groupings
   */
  groupPosition?: ButtonPositions;
  dataTestSubj?: string;
  textProps?: EuiButtonProps['textProps'];
};

export const ToolbarButton: React.FunctionComponent<ToolbarButtonProps> = ({
  children,
  className,
  fontWeight = 'normal',
  size = 'm',
  hasArrow = true,
  groupPosition = 'none',
  dataTestSubj = '',
  textProps,
  ...rest
}) => {
  const classes = classNames(
    'kbnToolbarButton',
    groupPositionToClassMap[groupPosition],
    [`kbnToolbarButton--${fontWeight}`, `kbnToolbarButton--${size}`],
    className
  );

  return (
    <EuiButton
      data-test-subj={dataTestSubj}
      className={classes}
      iconSide="right"
      iconType={hasArrow ? 'arrowDown' : ''}
      color="text"
      contentProps={{
        className: 'kbnToolbarButton__content',
      }}
      textProps={{
        ...textProps,
        className: classNames('kbnToolbarButton__text', textProps && textProps.className),
      }}
      {...rest}
      size={size}
    >
      {children}
    </EuiButton>
  );
};
