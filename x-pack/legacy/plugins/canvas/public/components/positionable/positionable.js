/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { matrixToCSS } from '../../lib/dom';

export const Positionable = ({ children, transformMatrix, width, height }) => {
  // Throw if there is more than one child
  React.Children.only(children);
  // This could probably be made nicer by having just one child
  const wrappedChildren = React.Children.map(children, child => {
    const newStyle = {
      width,
      height,
      marginLeft: -width / 2,
      marginTop: -height / 2,
      position: 'absolute',
      transform: matrixToCSS(transformMatrix.map((n, i) => (i < 12 ? n : Math.round(n)))),
    };

    const stepChild = React.cloneElement(child, { size: { width, height } });
    return (
      <div className="canvasPositionable canvasInteractable" style={newStyle}>
        {stepChild}
      </div>
    );
  });

  return wrappedChildren;
};

Positionable.propTypes = {
  onChange: PropTypes.func,
  children: PropTypes.element.isRequired,
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};
