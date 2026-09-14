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

export const HoverAnnotation: FC<Props> = ({ transformMatrix, width, height }) => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(
    () => css`
      outline: solid 1px ${euiTheme.colors.vis.euiColorVis0};
    `,
    [euiTheme]
  );

  return (
    <div
      className="canvasHoverAnnotation canvasLayoutAnnotation"
      css={styles}
      style={{
        width,
        height,
        marginLeft: -width / 2,
        marginTop: -height / 2,
        transform: matrixToCSS(transformMatrix),
      }}
    />
  );
};
