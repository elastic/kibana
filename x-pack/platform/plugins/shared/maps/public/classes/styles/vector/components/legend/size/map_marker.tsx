/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, CSSProperties } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { RightAlignedText } from '../right_aligned_text';

const FONT_SIZE = 10;

interface Props {
  radius: number;
  circleCenterX: number;
  circleTopY: number;
  textOffset: number;
  textY: number;
  formattedValue: string | number;
  circleCenterY: number;
  circleStyle: CSSProperties;
  onWidthChange: (width: number) => void;
}

export const MapMarker: FC<Props> = ({
  circleCenterX,
  circleCenterY,
  circleTopY,
  formattedValue,
  radius,
  textOffset,
  textY,
  onWidthChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const circleStyle = {
    fillOpacity: 0,
    stroke: euiTheme.colors.textParagraph,
    strokeWidth: 1,
  };

  return (
    <g key={radius}>
      <line
        style={{ stroke: euiTheme.border.color }}
        x1={circleCenterX}
        y1={circleTopY}
        x2={circleCenterX * 2.25}
        y2={circleTopY}
      />
      <RightAlignedText
        setWidth={onWidthChange}
        style={{ fontSize: FONT_SIZE, fill: euiTheme.colors.textParagraph }}
        x={circleCenterX * 2.25 + textOffset}
        y={textY}
        value={formattedValue}
      />
      <circle
        style={{ ...circleStyle, stroke: euiTheme.colors.textParagraph }}
        cx={circleCenterX}
        cy={circleCenterY}
        r={radius}
      />
    </g>
  );
};
