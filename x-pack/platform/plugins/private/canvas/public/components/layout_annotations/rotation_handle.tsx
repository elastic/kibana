/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { matrixToCSS } from '../../lib/dom';
import type { TransformMatrix3d } from '../../lib/aeroelastic';

interface Props {
  transformMatrix: TransformMatrix3d;
  zoomScale?: number;
}

export const RotationHandle: FC<Props> = ({ transformMatrix, zoomScale = 1 }) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(
    () => css`
      border-top: 1px dashed ${euiTheme.colors.lightShade};
      border-left: 1px dashed ${euiTheme.colors.lightShade};

      .canvasRotationHandle__handle {
        background-color: ${euiTheme.colors.mediumShade};
      }
    `,
    [euiTheme]
  );

  return (
    <div
      className="canvasRotationHandle canvasLayoutAnnotation"
      css={styles}
      style={{
        transform: matrixToCSS(transformMatrix),
      }}
    >
      <div
        className="canvasRotationHandle__handle"
        style={{ transform: `scale3d(${1 / zoomScale},${1 / zoomScale},1)` }}
      />
    </div>
  );
};
