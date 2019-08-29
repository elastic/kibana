/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { fontSizes } from '../../../../../style/variables';
import { getTimeFormatter } from '../../../../../utils/formatters';

const LegendLabel = styled.span`
  font-size: ${fontSizes.small};
`;

export const Legend: React.SFC<{
  getColorStyle: (scale: number) => string;
  min: number;
  max: number;
}> = ({ getColorStyle, min, max }) => {
  const formatter = getTimeFormatter(max);

  return (
    <div>
      <div
        style={{
          height: 6,
          opacity: 0.75,
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
        <LegendLabel>{formatter(min)}</LegendLabel>
        <LegendLabel>{formatter(max)}</LegendLabel>
      </div>
    </div>
  );
};
