/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { roundedBorderRadiusStyles } from '../../conversation.styles';

export const usePopoverButtonStyles = ({
  open,
  disabled = false,
}: {
  open: boolean;
  disabled?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const popoverButtonStyles = css`
    transition-property: none;
    min-inline-size: 0;
    ${roundedBorderRadiusStyles}
  `;
  const closedPopoverStyles = css`
    &:not(:hover) {
      border-color: transparent;
    }
  `;
  const disabledStyles = css`
    cursor: default;
    background-color: transparent;
    color: ${euiTheme.colors.textParagraph};
  `;
  return [popoverButtonStyles, !open && closedPopoverStyles, disabled && disabledStyles];
};

export const InputPopoverButton: React.FC<
  PropsWithChildren<{
    open: boolean;
    disabled: boolean;
    iconType: IconType;
    onClick: () => void;
    'aria-labelledby'?: string;
    'data-test-subj'?: string;
  }>
> = ({
  open,
  disabled,
  iconType,
  onClick,
  children,
  'aria-labelledby': ariaLabelledBy,
  'data-test-subj': dataTestSubj,
}) => {
  const popoverButtonStyles = usePopoverButtonStyles({ open, disabled });
  return (
    <EuiButtonEmpty
      color="text"
      css={popoverButtonStyles}
      iconSide="left"
      iconType={iconType}
      onClick={() => {
        if (!disabled) {
          onClick();
        }
      }}
      disabled={disabled}
      aria-haspopup="menu"
      aria-labelledby={ariaLabelledBy}
      data-test-subj={dataTestSubj}
    >
      {children}
    </EuiButtonEmpty>
  );
};
