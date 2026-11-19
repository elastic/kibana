/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const usePhaseCardStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    titleText: css`
      font-weight: ${euiTheme.font.weight.bold};
    `,
    disabledText: css`
      color: ${euiTheme.colors.disabledText};
    `,
    disabledBadgeText: css`
      .euiBadge__text {
        color: ${euiTheme.colors.disabledText};
      }
    `,
    titleItem: css`
      min-width: 0;
    `,
    fields: css`
      max-width: 100%;
    `,
  };
};
