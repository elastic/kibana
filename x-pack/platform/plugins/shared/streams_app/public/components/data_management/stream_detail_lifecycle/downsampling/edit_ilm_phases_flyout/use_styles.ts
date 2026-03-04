/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const useStyles = () => {
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

    const tabsErrorSelectedUnderlineStyles = css`
      .streamsIlmPhasesTab--hasErrors.euiTab-isSelected::after {
        border-color: ${euiTheme.colors.danger};
      }
    `;

    const phaseDescriptionStyles = css`
      padding: ${euiTheme.size.m} ${euiTheme.size.l} 0 ${euiTheme.size.l};
    `;

    return {
      sectionStyles,
      headerStyles,
      footerStyles,
      tabsErrorSelectedUnderlineStyles,
      phaseDescriptionStyles,
    };
  }, [euiTheme.colors.danger, euiTheme.size.l, euiTheme.size.m]);
};
