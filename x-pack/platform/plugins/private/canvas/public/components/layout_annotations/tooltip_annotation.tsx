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
  text: string;
}

export const TooltipAnnotation: FC<Props> = ({ transformMatrix, text }) => {
  const newStyle = {
    transform: `${matrixToCSS(transformMatrix)} translate(1em, -1em)`,
  };
  return (
    <div className="tooltipAnnotation canvasLayoutAnnotation" style={newStyle}>
      <p>{text}°</p>
    </div>
  );
};

TooltipAnnotation.propTypes = {
  // @ts-expect-error upgrade typescript v5.9.3
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  text: PropTypes.string.isRequired,
};
