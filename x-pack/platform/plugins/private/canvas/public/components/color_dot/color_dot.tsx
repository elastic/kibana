/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
import chroma from 'chroma-js';

interface Props {
  /** Nodes to display within the dot.  Should fit within the constraints. */
  children?: ReactNode;
  /** Any valid CSS color. If not a valid CSS string, the dot will be transparent and checkered */
  value?: string;
}

export const ColorDot: FC<Props> = ({ value, children }) => {
  let style = {};

  if (chroma.valid(value)) {
    style = { background: value };
  }

  return (
    <div className="canvasColorDot">
      <div className="canvasColorDot__background canvasCheckered" />
      <div className="canvasColorDot__foreground" style={style}>
        {children}
      </div>
    </div>
  );
};

ColorDot.propTypes = {
  // @ts-expect-error upgrade typescript v5.9.3
  children: PropTypes.node,
  value: PropTypes.string,
};
