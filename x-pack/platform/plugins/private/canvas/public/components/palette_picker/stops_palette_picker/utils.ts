/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { zip, take } from 'lodash';
import { htmlIdGenerator } from '@elastic/eui';
import { ColorPalette } from '../../../../common/lib';
import { ColorStop } from '../types';
import { Palette, PaletteColorStops } from './types';

const id = htmlIdGenerator();

export const getOverridenPaletteOptions = (): Pick<ColorPalette, 'range' | 'continuity'> => ({
  range: 'number',
  continuity: 'below',
});

export const createColorStop = (stop: number = 0, color: string = '') => ({
  stop,
  color,
  id: id(),
});

export const transformPaletteToColorStops = ({ stops = [], colors }: PaletteColorStops) =>
  zip(stops, colors).map(([stop, color]) => createColorStop(stop, color));

export const mergeColorStopsWithPalette =
  (palette: Palette) =>
  (colorStops: ColorStop[]): Palette => {
    const stopsWithColors = colorStops.reduce<{ colors: string[]; stops: number[] }>(
      (acc, { color, stop }) => {
        acc.colors.push(color ?? '');
        acc.stops.push(stop);
        return acc;
      },
      { colors: [], stops: [] }
    );
    return { ...palette, ...stopsWithColors };
  };

export const updateColorStop =
  (index: number, colorStop: ColorStop) => (colorStops: ColorStop[]) => {
    colorStops.splice(index, 1, colorStop);
    return colorStops;
  };

export const deleteColorStop = (index: number) => (colorStops: ColorStop[]) => {
  colorStops.splice(index, 1);
  return colorStops;
};

export const addNewColorStop = (palette: Palette) => (colorStops: ColorStop[]) => {
  const lastColorStopIndex = colorStops.length - 1;
  const lastStop = lastColorStopIndex >= 0 ? colorStops[lastColorStopIndex].stop + 1 : 0;
  const newIndex = lastColorStopIndex + 1;
  return [
    ...colorStops,
    {
      stop: lastStop,
      color:
        palette.colors.length > newIndex + 1
          ? palette.colors[newIndex]
          : palette.colors[palette.colors.length - 1],
    },
  ];
};

export const reduceColorsByStopsSize = (colors: string[] = [], stopsSize: number) => {
  const reducedColors = take(colors, stopsSize);
  const colorsLength = reducedColors.length;
  if (colorsLength === stopsSize) {
    return reducedColors;
  }

  return [
    ...reducedColors,
    ...Array(stopsSize - colorsLength).fill(reducedColors[colorsLength - 1] ?? ''),
  ];
};
