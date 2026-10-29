/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css, type SerializedStyles } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const useCanvasCheckeredStyles = (): SerializedStyles => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => css`
      background-color: ${euiTheme.colors.plainLight};
      background-image: linear-gradient(45deg, ${euiTheme.colors.lightShade} 25%, transparent 25%),
        linear-gradient(-45deg, ${euiTheme.colors.lightShade} 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, ${euiTheme.colors.lightShade} 75%),
        linear-gradient(-45deg, transparent 75%, ${euiTheme.colors.lightShade} 75%);
    `,
    [euiTheme]
  );
};
