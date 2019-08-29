/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { asTime } from '../../../../../utils/formatters';

export const Legend: React.SFC<{
  getColorStyle: (scale: number) => string;
  min: number;
  max: number;
}> = ({ getColorStyle, min, max }) => {
  const minTime =
    min === Infinity ? 'Infinity' : asTime(Number.isNaN(min) ? 0 : min);
  const maxTime =
    max === Infinity ? 'Infinity' : asTime(Number.isNaN(max) ? 0 : max);

  return (
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
        <span>{minTime}</span>
        <span>{maxTime}</span>
      </div>
    </div>
  );
};
