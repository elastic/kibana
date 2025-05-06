/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreTheme } from '@kbn/core/public';
import { getKbnPalettes } from '@kbn/palettes';
import {
  ColorMapping,
  DEFAULT_COLOR_MAPPING_CONFIG,
  PaletteOutput,
  getConfigFromPalette,
} from '@kbn/coloring';

export const paletteToColorMapping = <PaletteParams = Record<string, unknown>>(
  theme: CoreTheme,
  palette?: PaletteOutput<PaletteParams>,
  colorMapping?: ColorMapping.Config
) => {
  if (colorMapping) return colorMapping; // use colorMapping if for some reason it exists

  const palettes = getKbnPalettes(theme);

  return palette
    ? getConfigFromPalette(palettes, palette.name)
    : { ...DEFAULT_COLOR_MAPPING_CONFIG }; // no palette nor colorMapping
};
