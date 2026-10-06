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
        height: 100%;
      `,
      shell: css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        height: 100%;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.panel};
        overflow: hidden;
      `,
      body: css`
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        padding: ${euiTheme.size.l};
      `,
      emptyShell: css`
        justify-content: center;
      `,
      editingShell: css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
      `,
      editingBody: css`
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
      `,
      editingFormRow: css`
        flex: 1 1 auto;
        min-height: 0;
        margin-bottom: 0;

        & > .euiFormRow__fieldWrapper {
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          min-height: 0;
          height: 100%;
        }
      `,
      markdownEditorFill: css`
        flex: 1 1 auto;
        min-height: 0;
        height: 100%;
      `,
    }),
    [euiTheme]
  );
};
