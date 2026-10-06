/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

export const useKiDetailContentPanelStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      panelRoot: css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;

        @media (min-width: 768px) {
          min-height: 100%;
        }
      `,
      shell: css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.panel};
        overflow: hidden;
      `,
      shellFill: css`
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        min-height: 0;

        @media (min-width: 768px) {
          min-height: 100%;
        }
      `,
      body: css`
        padding: ${euiTheme.size.l};
      `,
      emptyShell: css`
        align-items: center;
        justify-content: center;
        padding: ${euiTheme.size.l};
      `,
      editingFormRow: css`
        margin-bottom: 0;
      `,
    }),
    [euiTheme]
  );
};
