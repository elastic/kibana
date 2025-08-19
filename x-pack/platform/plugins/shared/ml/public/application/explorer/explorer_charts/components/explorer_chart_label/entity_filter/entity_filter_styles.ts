/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { useEuiTheme } from '@elastic/eui';

export const useEntityFilterStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    filterButton: css({
      opacity: 0.5,
      width: euiTheme.size.base,
      height: euiTheme.size.base,
      transform: 'translateY(-1px)',
      '&:hover': {
        opacity: 1,
      },
      '.euiIcon': {
        width: euiTheme.size.m,
        height: euiTheme.size.m,
        color: euiTheme.colors.textSubdued,
      },
    }),
  };
};
