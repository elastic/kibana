/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, useEuiTheme, type CommonProps } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PropsWithChildren } from 'react';
import React from 'react';

export const OptionText: React.FC<PropsWithChildren<CommonProps>> = ({
  css: cssProp,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  className,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const fontWeightStyles = css`
    h4 {
      font-weight: ${euiTheme.font.weight.regular};
    }
    .euiSelectableListItem-isFocused & h4 {
      font-weight: ${euiTheme.font.weight.semiBold};
    }
  `;
  return (
    <EuiText
      size="s"
      css={[fontWeightStyles, cssProp]}
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
      className={className}
    >
      <h4>{children}</h4>
    </EuiText>
  );
};
