/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiShadow, useEuiTheme } from '@elastic/eui';
import { matrixToCSS } from '../../lib/dom';
import type { TransformMatrix3d } from '../../lib/aeroelastic';

interface Props {
  transformMatrix: TransformMatrix3d;
  zoomScale?: number;
}

export const BorderResizeHandle: FC<Props> = ({ transformMatrix, zoomScale = 1 }) => {
  const { euiTheme } = useEuiTheme();
  const slightShadow = useEuiShadow('xs');
  const styles = useMemo(
    () => css`
      ${slightShadow}
      background-color: ${euiTheme.colors.emptyShade};
      border: 1px solid ${euiTheme.colors.darkShade};
    `,
    [euiTheme, slightShadow]
  );

  return (
    <div
      className="canvasBorderResizeHandle canvasLayoutAnnotation"
      css={styles}
      style={{
        transform: `${matrixToCSS(transformMatrix)} scale3d(${1 / zoomScale},${1 / zoomScale}, 1)`,
      }}
    />
  );
};
