/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import {
  EuiButton,
  PropsOf,
  EuiButtonProps,
  type UseEuiTheme,
  euiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

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
  const euiThemeContext = useEuiTheme();
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
      css={toolbarButtonStyles(euiThemeContext)}
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

const toolbarButtonStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  return css`
    &.kbnToolbarButton {
      line-height: ${euiTheme.size.xxl}; // Keeps alignment of text and chart icon

      // todo: once issue https://github.com/elastic/eui/issues/4730 is merged, this code might be safe to remove
      // Some toolbar buttons are just icons, but EuiButton comes with margin and min-width that need to be removed
      min-width: 0;
      border-width: ${euiTheme.border.width.thin};
      border-style: solid;
      border-color: ${euiTheme.colors.borderBasePlain}; // Lighten the border color for all states

      // Override background color for non-disabled buttons
      &:not(:disabled) {
        background-color: ${euiTheme.colors.backgroundBasePlain};
      }

      &.kbnToolbarButton__text > svg {
        margin-top: -1px; // Just some weird alignment issue when icon is the child not the iconType
      }

      &.kbnToolbarButton__text:empty {
        margin: 0;
      }

      // Toolbar buttons don't look good with centered text when fullWidth
      &[class*='fullWidth'] {
        text-align: left;

        .kbnToolbarButton__content {
          justify-content: space-between;
        }
      }
    }

    &.kbnToolbarButton--groupLeft {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    &.kbnToolbarButton--groupCenter {
      border-radius: 0;
      border-left: none;
    }

    &.kbnToolbarButton--groupRight {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      border-left: none;
    }

    &.kbnToolbarButton--bold {
      font-weight: ${euiTheme.font.weight.bold};
    }

    &.kbnToolbarButton--normal {
      font-weight: ${euiTheme.font.weight.regular};
    }

    &.kbnToolbarButton--s {
      box-shadow: none !important; // sass-lint:disable-line no-important
      font-size: ${euiFontSize(euiThemeContext, 's').fontSize};
    }
  `;
};
