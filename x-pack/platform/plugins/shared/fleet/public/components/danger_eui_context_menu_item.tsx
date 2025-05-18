/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiContextMenuItemProps } from '@elastic/eui';
import { EuiContextMenuItem, useEuiTheme } from '@elastic/eui';

export const DangerEuiContextMenuItem = (props: EuiContextMenuItemProps) => {
  const theme = useEuiTheme();
  return (
    <EuiContextMenuItem
      {...props}
      css={css`
        color: ${theme.euiTheme.colors.textDanger};
      `}
    />
  );
};
