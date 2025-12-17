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
  height: number;
  transformMatrix: TransformMatrix3d;
  width: number;
}

export const AlignmentGuide: FC<Props> = ({ transformMatrix, width, height }) => (
  <div
    className="canvasAlignmentGuide canvasInteractable canvasLayoutAnnotation"
    style={{
      background: 'magenta',
      height,
      marginLeft: -width / 2,
      marginTop: -height / 2,
      position: 'absolute',
      transform: matrixToCSS(transformMatrix),
      width,
    }}
  />
);

AlignmentGuide.propTypes = {
  height: PropTypes.number.isRequired,
  // @ts-expect-error upgrade typescript v5.9.3
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
};
