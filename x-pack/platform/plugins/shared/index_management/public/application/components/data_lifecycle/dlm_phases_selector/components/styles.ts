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
    fields: css`
      max-width: 100%;
    `,
  };
};
