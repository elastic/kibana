/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PropsWithChildren } from 'react';
import React from 'react';

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
  const openStyles = css`
    text-decoration: underline;
  `;
  return (
    <EuiButtonEmpty
      css={open && openStyles}
      color="text"
      iconSide="left"
      flush="both"
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
