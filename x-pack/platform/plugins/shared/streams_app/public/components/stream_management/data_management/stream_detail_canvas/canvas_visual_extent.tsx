/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoordinateExtent, ViewportPortal } from '@xyflow/react';
import { css } from '@emotion/react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';

export function CanvasVisualExtent({ coords }: { coords?: CoordinateExtent }) {
  const { euiTheme } = useEuiTheme();

  if (!coords) {
    return null;
  }

  const [startPos, endPos] = coords;

  const width = endPos[0] - startPos[0];
  const height = endPos[1] - startPos[1];

  return (
    <ViewportPortal>
      <div
        css={css`
          transform: translate(${startPos[0]}px, ${startPos[1]}px);
          position: absolute;
          pointer-events: none;
          width: ${width}px;
          height: ${height}px;
          box-shadow: inset 0 0 ${euiTheme.border.width.thick}
            ${euiTheme.colors.borderBaseProminent};
        `}
      />
    </ViewportPortal>
  );
}
