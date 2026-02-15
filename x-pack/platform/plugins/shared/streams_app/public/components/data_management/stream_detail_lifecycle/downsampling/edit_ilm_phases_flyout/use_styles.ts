/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css, type SerializedStyles } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export interface EditIlmPhasesFlyoutStyles {
  sectionStyles: SerializedStyles;
  headerStyles: SerializedStyles;
  footerStyles: SerializedStyles;
}

export const useStyles = (): EditIlmPhasesFlyoutStyles => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const sectionStyles = css`
      padding: ${euiTheme.size.l};
    `;

    const headerStyles = css`
      padding: ${euiTheme.size.l} ${euiTheme.size.l} 0 ${euiTheme.size.l};
    `;

    const footerStyles = css`
      padding: ${euiTheme.size.m} ${euiTheme.size.l};
    `;

    return { sectionStyles, headerStyles, footerStyles };
  }, [euiTheme.size.l, euiTheme.size.m]);
};
