/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';

import {
  DataBounds,
  PaletteRegistry,
  PaletteOutput,
  CustomPaletteParams,
  getFallbackDataBounds,
  reversePalette,
  getPaletteStops,
  CUSTOM_PALETTE,
  enforceColorContrast,
  ColorMapping,
  getColorsFromMapping,
  DEFAULT_FALLBACK_PALETTE,
} from '@kbn/coloring';
import { getOriginalId } from '@kbn/transpose-utils';
import { Datatable, DatatableColumnType } from '@kbn/expressions-plugin/common';
import { DataType } from '../../types';

/**
 * Returns array of colors for provided palette or colorMapping
 */
export function getColorStops(
  paletteService: PaletteRegistry,
  isDarkMode: boolean,
  palette?: PaletteOutput<CustomPaletteParams>,
  colorMapping?: ColorMapping.Config
): string[] {
  return colorMapping
    ? getColorsFromMapping(isDarkMode, colorMapping)
    : palette?.name === CUSTOM_PALETTE
    ? palette?.params?.stops?.map(({ color }) => color) ?? []
    : paletteService
        .get(palette?.name || DEFAULT_FALLBACK_PALETTE)
        .getCategoricalColors(10, palette);
}

/**
 * Bucketed numerical columns should be treated as categorical
 */
export function shouldColorByTerms(
  dataType?: DataType | DatatableColumnType,
  isBucketed?: boolean
) {
  return isBucketed || dataType !== 'number';
}

export function getContrastColor(
  color: string,
  isDarkTheme: boolean,
  darkTextProp: 'euiColorInk' | 'euiTextColor' = 'euiColorInk',
  lightTextProp: 'euiColorGhost' | 'euiTextColor' = 'euiColorGhost'
) {
  // when in light theme both text color and colorInk are dark and the choice
  // may depends on the specific context.
  const darkColor = isDarkTheme ? euiDarkVars.euiColorInk : euiLightVars[darkTextProp];
  // Same thing for light color in dark theme
  const lightColor = isDarkTheme ? euiDarkVars[lightTextProp] : euiLightVars.euiColorGhost;
  const backgroundColor = isDarkTheme
    ? euiDarkVars.euiPageBackgroundColor
    : euiLightVars.euiPageBackgroundColor;
  return enforceColorContrast(color, backgroundColor) ? lightColor : darkColor;
}

export function getNumericValue(rowValue?: unknown) {
  return typeof rowValue === 'number' ? rowValue : undefined;
}

export function applyPaletteParams<T extends PaletteOutput<CustomPaletteParams>>(
  palettes: PaletteRegistry,
  activePalette: T,
  dataBounds: DataBounds
) {
  // make a copy of it as they have to be manipulated later on
  const displayStops = getPaletteStops(palettes, activePalette?.params || {}, {
    dataBounds,
    defaultPaletteName: activePalette?.name,
  });

  if (activePalette?.params?.reverse && activePalette?.params?.name !== CUSTOM_PALETTE) {
    return reversePalette(displayStops);
  }
  return displayStops;
}

export const findMinMaxByColumnId = (columnIds: string[], table: Datatable | undefined) => {
  const minMaxMap = new Map<string, DataBounds>();

  if (table != null) {
    for (const columnId of columnIds) {
      const originalId = getOriginalId(columnId);
      const minMax = minMaxMap.get(originalId) ?? {
        max: Number.NEGATIVE_INFINITY,
        min: Number.POSITIVE_INFINITY,
      };
      table.rows.forEach((row) => {
        const rowValue = row[columnId];
        const numericValue = getNumericValue(rowValue);
        if (numericValue != null) {
          if (minMax.min > numericValue) {
            minMax.min = numericValue;
          }
          if (minMax.max < numericValue) {
            minMax.max = numericValue;
          }
        }
      });

      // what happens when there's no data in the table? Fallback to a percent range
      if (minMax.max === Number.NEGATIVE_INFINITY) {
        minMaxMap.set(originalId, getFallbackDataBounds());
      } else {
        minMaxMap.set(originalId, minMax);
      }
    }
  }
  return minMaxMap;
};
