/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { RectAnnotation } from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';

interface BrushAnnotationProps {
  id: string;
  min: number;
  max: number;
}

export const DualBrushAnnotation: FC<BrushAnnotationProps> = ({ id, min, max }) => {
  const { euiTheme } = useEuiTheme();
  const { colors } = euiTheme;

  return (
    <RectAnnotation
      dataValues={[
        {
          coordinates: {
            x0: min,
            x1: max,
            y0: 0,
            y1: 1000000000,
          },
          details: id,
        },
      ]}
      id={`rect_brush_annotation_${id}`}
      style={{
        strokeWidth: 0,
        stroke: colors.lightShade,
        fill: colors.lightShade,
        opacity: 0.5,
      }}
      hideTooltips={true}
    />
  );
};
