/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { vislibColorMaps } from 'ui/color_maps';
import { getLegendColors, getColor } from 'ui/vis/map/color_util';
import { ColorGradient } from './components/color_gradient';
import { palettes } from '@elastic/eui/lib/services';
import tinycolor from 'tinycolor2';
import chroma from 'chroma-js';

const GRADIENT_INTERVALS = 8;

export const DEFAULT_FILL_COLORS = palettes.euiPaletteColorBlind.colors;
export const DEFAULT_LINE_COLORS = [
  ...DEFAULT_FILL_COLORS.map(color =>
    tinycolor(color)
      .darken()
      .toHexString()
  ),
  // Explicitly add black & white as border color options
  '#000',
  '#FFF',
];

function getColorRamp(colorRampName) {
  const colorRamp = vislibColorMaps[colorRampName];
  if (!colorRamp) {
    throw new Error(
      `${colorRampName} not found. Expected one of following values: ${Object.keys(
        vislibColorMaps
      )}`
    );
  }
  return colorRamp;
}

export function getRGBColorRangeStrings(colorRampName, numberColors = GRADIENT_INTERVALS) {
  const colorRamp = getColorRamp(colorRampName);
  return getLegendColors(colorRamp.value, numberColors);
}

export function getHexColorRangeStrings(colorRampName, numberColors = GRADIENT_INTERVALS) {
  return getRGBColorRangeStrings(colorRampName, numberColors).map(rgbColor =>
    chroma(rgbColor).hex()
  );
}

export function getColorRampCenterColor(colorRampName) {
  const colorRamp = getColorRamp(colorRampName);
  const centerIndex = Math.floor(colorRamp.value.length / 2);
  return getColor(colorRamp.value, centerIndex);
}

// Returns an array of color stops
// [ stop_input_1: number, stop_output_1: color, stop_input_n: number, stop_output_n: color ]
export function getColorRampStops(colorRampName, numberColors = GRADIENT_INTERVALS) {
  return getHexColorRangeStrings(colorRampName, numberColors).reduce(
    (accu, stopColor, idx, srcArr) => {
      const stopNumber = idx / srcArr.length; // number between 0 and 1, increasing as index increases
      return [...accu, stopNumber, stopColor];
    },
    []
  );
}

export const COLOR_GRADIENTS = Object.keys(vislibColorMaps).map(colorRampName => ({
  value: colorRampName,
  inputDisplay: <ColorGradient colorRampName={colorRampName} />,
}));

export const COLOR_RAMP_NAMES = Object.keys(vislibColorMaps);

export function getLinearGradient(colorStrings) {
  const intervals = colorStrings.length;
  let linearGradient = `linear-gradient(to right, ${colorStrings[0]} 0%,`;
  for (let i = 1; i < intervals - 1; i++) {
    linearGradient = `${linearGradient} ${colorStrings[i]} \
      ${Math.floor((100 * i) / (intervals - 1))}%,`;
  }
  return `${linearGradient} ${colorStrings[colorStrings.length - 1]} 100%)`;
}
