/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { useEuiTheme, euiTextTruncate } from '@elastic/eui';

export const useEntityCellStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    fieldValueShort: css`
      ${euiTextTruncate()};
      display: inline-block;
      vertical-align: bottom;
    `,
    fieldValueLong: css({
      overflowWrap: 'break-word',
    }),
    filterButton: css({
      opacity: 0.5,
      width: euiTheme.size.base,
      height: euiTheme.size.base,
      color: euiTheme.colors.textSubdued,
      transform: 'translateY(-1px)',
      '&:hover': {
        opacity: 1,
      },
      '.euiIcon': {
        width: euiTheme.size.m,
        height: euiTheme.size.m,
      },
    }),
  };
};
