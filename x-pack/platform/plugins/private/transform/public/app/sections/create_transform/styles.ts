/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const useIntervalButtonStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    button: css`
      width: ${euiTheme.size.l};
    `,
  };
};

export const transformLabelStyles = css`
  min-width: 0;
`;
