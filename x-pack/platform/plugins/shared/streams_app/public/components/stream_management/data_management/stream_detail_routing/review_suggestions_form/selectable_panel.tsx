/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPanelProps } from '@elastic/eui';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/css';

export function SelectablePanel(props: EuiPanelProps & { isSelected: boolean }) {
  const { euiTheme } = useEuiTheme();

  const { isSelected, ...rest } = props;

  return (
    <EuiPanel
      {...rest}
      color="subdued"
      hasBorder={false}
      hasShadow={false}
      className={css`
        border: ${isSelected ? `1px solid ${euiTheme.colors.primary}` : euiTheme.border.thin};
      `}
    />
  );
}
