/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { difference, first, values } from 'lodash';
import { euiPaletteColorBlind } from '@elastic/eui';

export enum MetricsExplorerColor {
  color0 = 'color0',
  color1 = 'color1',
  color2 = 'color2',
  color3 = 'color3',
  color4 = 'color4',
  color5 = 'color5',
  color6 = 'color6',
  color7 = 'color7',
  color8 = 'color8',
  color9 = 'color9',
}

export interface MetricsExplorerPalette {
  [MetricsExplorerColor.color0]: string;
  [MetricsExplorerColor.color1]: string;
  [MetricsExplorerColor.color2]: string;
  [MetricsExplorerColor.color3]: string;
  [MetricsExplorerColor.color4]: string;
  [MetricsExplorerColor.color5]: string;
  [MetricsExplorerColor.color6]: string;
  [MetricsExplorerColor.color7]: string;
  [MetricsExplorerColor.color8]: string;
  [MetricsExplorerColor.color9]: string;
}

const euiPalette = euiPaletteColorBlind();

export const defaultPalette: MetricsExplorerPalette = {
  [MetricsExplorerColor.color0]: euiPalette[1], // (blue)
  [MetricsExplorerColor.color1]: euiPalette[2], // (pink)
  [MetricsExplorerColor.color2]: euiPalette[0], // (green-ish)
  [MetricsExplorerColor.color3]: euiPalette[3], // (purple)
  [MetricsExplorerColor.color4]: euiPalette[4], // (light pink)
  [MetricsExplorerColor.color5]: euiPalette[5], // (yellow)
  [MetricsExplorerColor.color6]: euiPalette[6], // (tan)
  [MetricsExplorerColor.color7]: euiPalette[7], // (orange)
  [MetricsExplorerColor.color8]: euiPalette[8], // (brown)
  [MetricsExplorerColor.color9]: euiPalette[9], // (red)
};

export const createPaletteTransformer = (palette: MetricsExplorerPalette) => (
  color: MetricsExplorerColor
) => palette[color];

export const colorTransformer = createPaletteTransformer(defaultPalette);

export const sampleColor = (usedColors: MetricsExplorerColor[] = []): MetricsExplorerColor => {
  const available = difference(values(MetricsExplorerColor) as MetricsExplorerColor[], usedColors);
  return first(available) || MetricsExplorerColor.color0;
};
