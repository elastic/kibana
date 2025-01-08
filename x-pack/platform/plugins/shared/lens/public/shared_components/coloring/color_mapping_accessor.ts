/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColorFactory, ColorMappingInputCategoricalData } from '@kbn/coloring';
import { KbnPalettes } from '@kbn/palettes';
import { CellColorFn } from './get_cell_color_fn';

/**
 * Return a color accessor function for XY charts depending on the split accessors received.
 */
export function getColorAccessorFn(
  palettes: KbnPalettes,
  colorMapping: string,
  data: ColorMappingInputCategoricalData,
  isDarkMode: boolean
): CellColorFn {
  const getColor = getColorFactory(JSON.parse(colorMapping), palettes, isDarkMode, data);

  return (value) => {
    if (value === undefined || value === null) return null;

    return getColor(String(value));
  };
}
