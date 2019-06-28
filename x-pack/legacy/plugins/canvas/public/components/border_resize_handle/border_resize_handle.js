/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { matrixToCSS } from '../../lib/dom';

export const BorderResizeHandle = ({ transformMatrix, zoomScale }) => (
  <div
    className="canvasBorderResizeHandle canvasLayoutAnnotation"
    style={{
      transform: `${matrixToCSS(transformMatrix)} scale3d(${1 / zoomScale},${1 / zoomScale}, 1)`,
    }}
  />
);

BorderResizeHandle.propTypes = {
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
};
