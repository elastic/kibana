/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export const ColorProgressionBar: React.SFC<{
  getColorStyle: (scale: number) => string;
  min: React.ReactNode;
  max: React.ReactNode;
}> = ({ getColorStyle, min, max }) => (
  <div>
    <div
      style={{
        height: 6,
        backgroundImage: `linear-gradient(to right, ${[0, 0.5, 1]
          .map(getColorStyle)
          .join(',')})`
      }}
    />
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between'
      }}
    >
      <span>{min}</span>
      <span>{max}</span>
    </div>
  </div>
);
