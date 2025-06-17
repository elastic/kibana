/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ColorMappingInputData,
  PaletteOutput,
  PaletteRegistry,
  getSpecialString,
  getValueKey,
} from '@kbn/coloring';
import { CustomPaletteState } from '@kbn/charts-plugin/common';
import { KbnPalettes } from '@kbn/palettes';
import { RawValue } from '@kbn/data-plugin/common';
import { getColorAccessorFn } from './color_mapping_accessor';

export type CellColorFn = (value: RawValue) => string | null;

export function getCellColorFn(
  paletteService: PaletteRegistry,
  palettes: KbnPalettes,
  data: ColorMappingInputData,
  colorByTerms: boolean,
  isDarkMode: boolean,
  syncColors: boolean,
  palette?: PaletteOutput<CustomPaletteState>,
  colorMapping?: string
): CellColorFn {
  if (!colorByTerms && palette && data.type === 'ranges') {
    return (value) => {
      if (value === null || value === undefined || typeof value !== 'number') return null;

      return (
        paletteService.get(palette.name).getColorForValue?.(value, palette.params, data) ?? null
      );
    };
  }

  if (colorByTerms && data.type === 'categories') {
    if (colorMapping) {
      return getColorAccessorFn(palettes, colorMapping, data, isDarkMode);
    } else if (palette) {
      return (value: RawValue) => {
        if (value === undefined || value === null) return null;

        const key = getValueKey(value);

        return paletteService.get(palette.name).getCategoricalColor(
          [
            {
              name: getSpecialString(key), // needed to sync special categories (i.e. '')
              rankAtDepth: Math.max(
                data.categories.findIndex((v) => v === key),
                0
              ),
              totalSeriesAtDepth: data.categories.length || 1,
            },
          ],
          {
            maxDepth: 1,
            totalSeries: data.categories.length || 1,
            behindText: false,
            syncColors,
          },
          palette?.params ?? { colors: [] }
        );
      };
    }
  }

  return () => null;
}
