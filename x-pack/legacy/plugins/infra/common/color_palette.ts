/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { difference, first, values } from 'lodash';

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

export const defaultPalette: MetricsExplorerPalette = {
  [MetricsExplorerColor.color0]: '#3185FC', // euiColorVis1 (blue)
  [MetricsExplorerColor.color1]: '#DB1374', // euiColorVis2 (red-ish)
  [MetricsExplorerColor.color2]: '#00B3A4', // euiColorVis0 (green-ish)
  [MetricsExplorerColor.color3]: '#490092', // euiColorVis3 (purple)
  [MetricsExplorerColor.color4]: '#FEB6DB', // euiColorVis4 (pink)
  [MetricsExplorerColor.color5]: '#E6C220', // euiColorVis5 (yellow)
  [MetricsExplorerColor.color6]: '#BFA180', // euiColorVis6 (tan)
  [MetricsExplorerColor.color7]: '#F98510', // euiColorVis7 (orange)
  [MetricsExplorerColor.color8]: '#461A0A', // euiColorVis8 (brown)
  [MetricsExplorerColor.color9]: '#920000', // euiColorVis9 (maroon)
};

export const createPaletteTransformer = (palette: MetricsExplorerPalette) => (
  color: MetricsExplorerColor
) => palette[color];

export const colorTransformer = createPaletteTransformer(defaultPalette);

export const sampleColor = (usedColors: MetricsExplorerColor[] = []): MetricsExplorerColor => {
  const available = difference(values(MetricsExplorerColor) as MetricsExplorerColor[], usedColors);
  return first(available) || MetricsExplorerColor.color0;
};
