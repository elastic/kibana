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
import { css, cx } from '@emotion/css';

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
  const euiThemeContext = useEuiTheme();

  const dynamicClass = styles.toolbarButtonStyles(euiThemeContext);

  const classes = cx(
    'kbnToolbarButton',
    groupPositionToClassMap[groupPosition],
    [`kbnToolbarButton--${fontWeight}`, `kbnToolbarButton--${size}`],
    className,
    dynamicClass
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
