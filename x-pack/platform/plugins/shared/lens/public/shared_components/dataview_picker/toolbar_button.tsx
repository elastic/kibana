/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import { EuiButton, PropsOf, EuiButtonProps, type UseEuiTheme, euiFontSize } from '@elastic/eui';
import { css, cx } from '@emotion/css';
import { useMemoizedStyles2 } from '@kbn/core/public';

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
  fontWeight?: Weights;
  size?: EuiButtonProps['size'];
  hasArrow?: boolean;
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
  const { toolbarButtonStyles } = useMemoizedStyles2(styles);

  const classes = cx(
    'kbnToolbarButton',
    groupPositionToClassMap[groupPosition],
    [`kbnToolbarButton--${fontWeight}`, `kbnToolbarButton--${size}`],
    className,
    toolbarButtonStyles
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

const styles = {
  toolbarButtonStyles: (euiThemeContext: UseEuiTheme) => css`
    &.kbnToolbarButton {
      line-height: ${euiThemeContext.euiTheme.size.xxl};
      min-width: 0;
      border-width: ${euiThemeContext.euiTheme.border.width.thin};
      border-style: solid;
      border-color: ${euiThemeContext.euiTheme.border.color};

      &:not(:disabled) {
        background-color: ${euiThemeContext.euiTheme.colors.backgroundBasePlain};
      }

      &.kbnToolbarButton__text > svg {
        margin-top: -1px;
      }

      &.kbnToolbarButton__text:empty {
        margin: 0;
      }

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
      font-weight: ${euiThemeContext.euiTheme.font.weight.bold};
    }

    &.kbnToolbarButton--normal {
      font-weight: ${euiThemeContext.euiTheme.font.weight.regular};
    }

    &.kbnToolbarButton--s {
      box-shadow: none !important;
      font-size: ${euiFontSize(euiThemeContext, 's').fontSize};
    }
  `,
};
