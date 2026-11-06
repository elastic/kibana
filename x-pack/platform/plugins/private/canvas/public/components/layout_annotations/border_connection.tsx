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
  height: number;
  transformMatrix: TransformMatrix3d;
  width: number;
}

export const BorderConnection: FC<Props> = ({ transformMatrix, width, height }) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(
    () => css`
      border-top: 1px dashed ${euiTheme.colors.lightShade};
      border-left: 1px dashed ${euiTheme.colors.lightShade};
    `,
    [euiTheme]
  );

  return (
    <div
      className="canvasBorderConnection canvasLayoutAnnotation"
      css={styles}
      style={{
        height,
        marginLeft: -width / 2,
        marginTop: -height / 2,
        position: 'absolute',
        transform: matrixToCSS(transformMatrix),
        width,
      }}
    />
  );
};
