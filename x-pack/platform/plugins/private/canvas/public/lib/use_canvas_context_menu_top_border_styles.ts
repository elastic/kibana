/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css, type SerializedStyles } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const useCanvasContextMenuTopBorderStyles = (): SerializedStyles => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => css`
      & .canvasContextMenu--topBorder {
        border-top: ${euiTheme.border.thin};
      }
    `,
    [euiTheme]
  );
};
