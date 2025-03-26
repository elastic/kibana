/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { useEuiTheme, useEuiOverflowScroll } from '@elastic/eui';

export const useHelpPopoverStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    helpPopoverPanel: css({
      maxWidth: `${euiTheme.base * 30}px`,
    }),
    helpPopoverContent: css`
      ${useEuiOverflowScroll('y', true)};
      max-height: 40vh;
      padding: ${euiTheme.size.s};
    `,
  };
};
