/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { matrixToCSS } from '../../lib/dom';

export const AlignmentGuide = ({ transformMatrix, width, height }) => {
  const newStyle = {
    width,
    height,
    marginLeft: -width / 2,
    marginTop: -height / 2,
    background: 'magenta',
    position: 'absolute',
    transform: matrixToCSS(transformMatrix),
  };
  return (
    <div
      className="canvasAlignmentGuide canvasInteractable canvasLayoutAnnotation"
      style={newStyle}
    />
  );
};

AlignmentGuide.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};
