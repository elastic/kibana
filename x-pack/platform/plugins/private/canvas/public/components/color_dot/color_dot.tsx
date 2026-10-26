/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import chroma from 'chroma-js';
import { useCanvasCheckeredStyles } from '../../lib/use_canvas_checkered_styles';

interface Props {
  /** Nodes to display within the dot.  Should fit within the constraints. */
  children?: ReactNode;
  /** Any valid CSS color. If not a valid CSS string, the dot will be transparent and checkered */
  value?: string;
}

export const ColorDot: FC<Props> = ({ value, children }) => {
  const { euiTheme } = useEuiTheme();
  const checkeredStyles = useCanvasCheckeredStyles();
  const styles = useMemo(
    () => css`
      & .canvasColorDot__foreground {
        border: ${euiTheme.border.thin};
      }
    `,
    [euiTheme]
  );

  let style = {};

  if (chroma.valid(value)) {
    style = { background: value };
  }

  return (
    <div className="canvasColorDot" css={styles}>
      <div className="canvasColorDot__background canvasCheckered" css={checkeredStyles} />
      <div className="canvasColorDot__foreground" style={style}>
        {children}
      </div>
    </div>
  );
};
