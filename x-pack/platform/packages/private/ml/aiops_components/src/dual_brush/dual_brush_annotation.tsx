/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { RectAnnotation } from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import type { RectAnnotationSpec } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';

interface BrushAnnotationProps {
  id: string;
  min: number;
  max: number;
  style?: RectAnnotationSpec['style'];
}

/**
 * DualBrushAnnotation React Component
 * Dual brush annotation component that overlays the document count chart
 *
 * @param props BrushAnnotationProps component props
 * @returns The DualBrushAnnotation component.
 */
export const DualBrushAnnotation: FC<BrushAnnotationProps> = (props) => {
  const { id, min, max, style } = props;
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
      style={
        style ?? {
          strokeWidth: 0,
          stroke: colors.lightShade,
          fill: colors.lightShade,
          opacity: 0.5,
        }
      }
      hideTooltips={true}
    />
  );
};
