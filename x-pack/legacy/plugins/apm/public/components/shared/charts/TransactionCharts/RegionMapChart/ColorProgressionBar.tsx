/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export const ColorProgressionBar: React.SFC<{
  slices: number;
  getColorStyle: (scale: number) => string;
  showProgressiveHeight?: boolean;
  style?: React.CSSProperties;
  className?: string;
}> = ({ slices, getColorStyle, showProgressiveHeight, style, className }) => (
  <div
    style={{
      display: 'flex',
      alignItems: showProgressiveHeight ? 'center' : 'stretch',
      height: 6,
      ...style
    }}
    className={className}
  >
    {Array(slices)
      .fill(0)
      .map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: showProgressiveHeight
              ? `${(i / (2 * slices - 2) + 0.5) * 100}%`
              : undefined,
            background: getColorStyle(i / (slices - 1))
          }}
        />
      ))}
  </div>
);
