/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnPalette } from '@kbn/palettes';
import type { Theme } from '@kbn/ui-theme';
import { DEFAULT_PALETTE_ID } from './palette_config';
import type { SecondaryTrendPalettes } from './types';

export const getMappedSecondaryTrendPalettes = (
  paletteId: string,
  euiTheme: Theme
): SecondaryTrendPalettes => {
  const euiTextParagraph = euiTheme.euiColorTextParagraph;

  // Mapping: https://github.com/elastic/kibana/issues/251614
  const palettesById: Record<string, SecondaryTrendPalettes> = {
    [KbnPalette.CompareTo]: {
      palette: [
        euiTheme.euiColorBackgroundLightDanger,
        euiTheme.euiColorBackgroundLightText,
        euiTheme.euiColorBackgroundLightSuccess,
      ],
      textPalette: [euiTheme.euiColorTextDanger, euiTextParagraph, euiTheme.euiColorTextSuccess],
    },
    [KbnPalette.Complementary]: {
      palette: [
        euiTheme.euiColorBackgroundLightPrimary,
        euiTheme.euiColorBackgroundLightText,
        euiTheme.euiColorBackgroundLightWarning,
      ],
      textPalette: [euiTheme.euiColorTextPrimary, euiTextParagraph, euiTheme.euiColorTextWarning],
    },
    [KbnPalette.Temperature]: {
      palette: [
        euiTheme.euiColorBackgroundLightPrimary,
        euiTheme.euiColorBackgroundLightText,
        euiTheme.euiColorBackgroundLightDanger,
      ],
      textPalette: [euiTheme.euiColorTextPrimary, euiTextParagraph, euiTheme.euiColorTextDanger],
    },
  };

  return palettesById[paletteId] ?? palettesById[DEFAULT_PALETTE_ID]!;
};
