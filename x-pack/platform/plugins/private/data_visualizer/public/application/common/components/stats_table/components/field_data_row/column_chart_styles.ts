/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme, useEuiFontSize, euiTextTruncate } from '@elastic/eui';
import { css } from '@emotion/react';

export const useColumnChartStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { fontSize: euiFontSizeL } = useEuiFontSize('l');

  return {
    histogram: css({
      width: '100%',
    }),
    legend: css`
      ${euiTextTruncate()};
      color: ${euiTheme.colors.textSubdued};
      display: block;
      overflow-x: hidden;
      font-style: italic;
      font-weight: ${euiTheme.font.weight.regular};
      text-align: left;
      line-height: 1.1;
      font-size: calc(${euiFontSizeL} / 2);
    `,
    legendNumeric: css({
      textAlign: 'right',
    }),
    legendBoolean: css`
      width: calc(${euiTheme.size.xs} * 2.5);
    `,
    dataGridHeader: css({
      '.euiDataGridHeaderCell__content': {
        marginTop: 'auto',
      },
    }),
  };
};
