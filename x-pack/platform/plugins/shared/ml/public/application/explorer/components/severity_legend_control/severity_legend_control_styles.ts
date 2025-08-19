/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const useSeverityLegendControlStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    severityControl: css({
      height: '100%',
      padding: `0 ${euiTheme.size.s}`,
    }),
    severityButton: css({
      padding: `${euiTheme.size.xs}`,
      '&:hover': {
        backgroundColor: 'transparent',
      },
      '&:focus': {
        backgroundColor: 'transparent',
      },
    }),
    severityText: (isSelected: boolean) =>
      css({
        color: isSelected ? euiTheme.colors.textParagraph : euiTheme.colors.textDisabled,
      }),
  };
};
