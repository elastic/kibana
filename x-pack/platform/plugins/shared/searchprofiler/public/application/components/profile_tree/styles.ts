/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const useSharedDetailsStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    shardDetails: css`
      line-height: 1;
      overflow-wrap: break-word;

      h3 {
        font-size: ${useEuiFontSize('m').fontSize};
      }

      &:disabled {
        text-decoration: none !important;
        cursor: default;
      }
    `,
    shardDetailsDim: css`
      small {
        color: ${euiTheme.colors.darkShade};
      }
    `,
  };
};
