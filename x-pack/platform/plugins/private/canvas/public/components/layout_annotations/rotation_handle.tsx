/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
import { matrixToCSS } from '../../lib/dom';
import type { TransformMatrix3d } from '../../lib/aeroelastic';

interface Props {
  transformMatrix: TransformMatrix3d;
  zoomScale?: number;
}

export const RotationHandle: FC<Props> = ({ transformMatrix, zoomScale = 1 }) => (
  <div
    className="canvasRotationHandle canvasLayoutAnnotation"
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

RotationHandle.propTypes = {
  // @ts-expect-error upgrade typescript v5.9.3
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  zoomScale: PropTypes.number,
};
