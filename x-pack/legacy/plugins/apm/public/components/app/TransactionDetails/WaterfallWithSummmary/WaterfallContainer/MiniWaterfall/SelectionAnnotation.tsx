/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RectAnnotation } from '@elastic/charts';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { WaterfallSelection } from '../';
import { IWaterfall } from '../Waterfall/waterfall_helpers/waterfall_helpers';

interface SelectionAnnotationProps {
  maxY: number;
  selection: WaterfallSelection;
  waterfall: IWaterfall;
}

export function SelectionAnnotation({
  maxY,
  selection,
  waterfall
}: SelectionAnnotationProps) {
  const x0 = 0;

  // FIXME: This is not supposed to be "-1", but it doesn't show up at all if
  // you leave that off. Using the -1 makes it show up, but the bottom bar is
  // not highlighted.
  const x1 = selection[0] ? waterfall.items.length - 1 : 0;
  const y1left = selection[0] ?? 0;
  const y0right = selection[1] ?? 0;

  return (
    <RectAnnotation
      dataValues={[
        {
          coordinates: {
            x0,
            x1,
            y0: 0,
            y1: y1left
          }
        },
        {
          coordinates: {
            x0,
            x1,
            y0: y0right,
            y1: maxY
          }
        }
      ]}
      id="selection"
      style={{
        strokeWidth: parseInt(lightTheme.euiBorderWidthThin, 10),
        stroke: lightTheme.euiBorderColor,
        fill: lightTheme.euiColorDarkestShade,
        opacity: 0.25
      }}
      zIndex={1}
    />
  );
}
