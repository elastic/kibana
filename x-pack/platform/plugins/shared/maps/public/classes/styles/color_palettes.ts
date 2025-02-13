/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import tinycolor from 'tinycolor2';
import {
  colorPalette as colorPaletteGenerator,
  euiPaletteForStatus,
  euiPaletteForTemperature,
  euiPaletteCool,
  euiPaletteWarm,
  euiPaletteRed,
  euiPaletteGreen,
  euiPaletteGray,
  euiPaletteColorBlind,
  EuiColorPalettePickerPaletteProps,
} from '@elastic/eui';
import { PercentilesFieldMeta } from '../../../common/descriptor_types';

export const DEFAULT_HEATMAP_COLOR_RAMP_NAME = 'theclassic';

export const DEFAULT_FILL_COLORS: string[] = euiPaletteColorBlind();
export const DEFAULT_LINE_COLORS: string[] = [
  ...DEFAULT_FILL_COLORS.map((color: string) => tinycolor(color).darken().toHexString()),
  // Explicitly add black & white as border color options
  '#000',
  '#FFF',
];

const ROYAL_BLUE = 'rgb(65, 105, 225)';
const CYAN = 'rgb(0, 256, 256)';
const LIME = 'rgb(0, 256, 0)';
const YELLOW = 'rgb(256, 256, 0)';
const RED = 'rgb(256, 0, 0)';
const HEATMAP_PALETTE = [ROYAL_BLUE, CYAN, LIME, YELLOW, RED];

type COLOR_PALETTE = EuiColorPalettePickerPaletteProps & {
  getPalette: (steps: number) => string[];
};

function getColorBlindPalette(steps: number) {
  const rotations = Math.ceil(steps / 10);
  const palette = euiPaletteColorBlind({ rotations });
  return palette.slice(0, steps - 1);
}

const COLOR_PALETTES: COLOR_PALETTE[] = [
  {
    // TODO remove all empty `title` props below after
    // https://github.com/elastic/eui/pull/8289 is released
    title: '',
    value: 'Blues',
    getPalette: (steps: number) => {
      return euiPaletteCool(steps);
    },
    palette: euiPaletteCool(8),
    type: 'gradient',
  },
  {
    title: '',
    value: 'Greens',
    getPalette: (steps: number) => {
      return euiPaletteGreen(steps);
    },
    palette: euiPaletteGreen(8),
    type: 'gradient',
  },
  {
    title: '',
    value: 'Greys',
    getPalette: (steps: number) => {
      return euiPaletteGray(steps);
    },
    palette: euiPaletteGray(8),
    type: 'gradient',
  },
  {
    title: '',
    value: 'Reds',
    getPalette: (steps: number) => {
      return euiPaletteRed(steps);
    },
    palette: euiPaletteRed(8),
    type: 'gradient',
  },
  {
    title: '',
    value: 'Yellow to Red',
    getPalette: (steps: number) => {
      return euiPaletteWarm(steps);
    },
    palette: euiPaletteWarm(8),
    type: 'gradient',
  },
  {
    title: '',
    value: 'Green to Red',
    getPalette: (steps: number) => {
      return euiPaletteForStatus(steps);
    },
    palette: euiPaletteForStatus(8),
    type: 'gradient',
  },
  {
    title: '',
    value: 'Blue to Red',
    getPalette: (steps: number) => {
      return euiPaletteForTemperature(steps);
    },
    palette: euiPaletteForTemperature(8),
    type: 'gradient',
  },
  {
    title: '',
    value: DEFAULT_HEATMAP_COLOR_RAMP_NAME,
    getPalette: (steps: number) => {
      return colorPaletteGenerator(HEATMAP_PALETTE, steps, true, true);
    },
    palette: HEATMAP_PALETTE,
    type: 'gradient',
  },
  {
    title: '',
    value: 'palette_0',
    getPalette: getColorBlindPalette,
    palette: euiPaletteColorBlind(),
    type: 'fixed',
  },
  {
    title: '',
    value: 'palette_20',
    getPalette: getColorBlindPalette,
    palette: euiPaletteColorBlind({ rotations: 2 }),
    type: 'fixed',
  },
  {
    title: '',
    value: 'palette_30',
    getPalette: getColorBlindPalette,
    palette: euiPaletteColorBlind({ rotations: 3 }),
    type: 'fixed',
  },
];

export const NUMERICAL_COLOR_PALETTES = COLOR_PALETTES.filter((palette: COLOR_PALETTE) => {
  return palette.type === 'gradient';
});

export const CATEGORICAL_COLOR_PALETTES = COLOR_PALETTES.filter((palette: COLOR_PALETTE) => {
  return palette.type === 'fixed';
});

export function getColorPalette(colorPaletteId: string): string[] {
  const colorPalette = COLOR_PALETTES.find(({ value }: COLOR_PALETTE) => {
    return value === colorPaletteId;
  });
  return colorPalette ? [...(colorPalette.palette as string[])] : [];
}

export function getColorRampCenterColor(colorPaletteId: string): string | null {
  if (!colorPaletteId) {
    return null;
  }
  const palette = getColorPalette(colorPaletteId);
  return palette.length === 0 ? null : palette[Math.floor(palette.length / 2)];
}

// Returns an array of color stops
// [ stop_input_1: number, stop_output_1: color, stop_input_n: number, stop_output_n: color ]
export function getOrdinalMbColorRampStops(
  colorPaletteId: string | null,
  min: number,
  max: number,
  invert: boolean
): Array<number | string> | null {
  if (!colorPaletteId) {
    return null;
  }

  if (min > max) {
    return null;
  }

  const palette = getColorPalette(colorPaletteId);
  if (invert) {
    palette.reverse();
  }

  if (palette.length === 0) {
    return null;
  }

  if (max === min) {
    // just return single stop value
    return [max, palette[palette.length - 1]];
  }

  const delta = max - min;
  return palette.reduce(
    (accu: Array<number | string>, stopColor: string, idx: number, srcArr: string[]) => {
      const stopNumber = min + (delta * idx) / srcArr.length;
      accu.push(stopNumber, stopColor);
      return accu;
    },
    []
  );
}

// Returns an array of color stops
// [ stop_input_1: number, stop_output_1: color, stop_input_n: number, stop_output_n: color ]
export function getPercentilesMbColorRampStops(
  colorPaletteId: string | null,
  percentiles: PercentilesFieldMeta,
  invert: boolean
): Array<number | string> | null {
  if (!colorPaletteId) {
    return null;
  }

  const paletteObject = NUMERICAL_COLOR_PALETTES.find(({ value }: COLOR_PALETTE) => {
    return value === colorPaletteId;
  });

  if (!paletteObject) {
    return null;
  }

  const palette = paletteObject.getPalette(percentiles.length);
  if (invert) {
    palette.reverse();
  }
  return palette.reduce((accu: Array<number | string>, stopColor: string, idx: number) => {
    accu.push(percentiles[idx].value, stopColor);
    return accu;
  }, []);
}

export function getLinearGradient(colorStrings: string[]): string {
  const intervals = colorStrings.length;
  let linearGradient = `linear-gradient(to right, ${colorStrings[0]} 0%,`;
  for (let i = 1; i < intervals - 1; i++) {
    linearGradient = `${linearGradient} ${colorStrings[i]} \
      ${Math.floor((100 * i) / (intervals - 1))}%,`;
  }
  return `${linearGradient} ${colorStrings[colorStrings.length - 1]} 100%)`;
}
