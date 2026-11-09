/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidHex, euiPaletteColorBlind } from '@elastic/eui';
import _ from 'lodash';

export type StopValue = number | string | null;

export interface ColorStop {
  stop: StopValue;
  color: string;
}

const DEFAULT_CUSTOM_PALETTE = euiPaletteColorBlind({ rotations: 3 });

export const DEFAULT_CUSTOM_COLOR = DEFAULT_CUSTOM_PALETTE[0];

export function removeRow(colorStops: ColorStop[], index: number) {
  if (colorStops.length === 1) {
    return colorStops;
  }

  return [...colorStops.slice(0, index), ...colorStops.slice(index + 1)];
}

export function addOrdinalRow(colorStops: ColorStop[], index: number) {
  const currentStop = colorStops[index].stop as number;
  let delta = 1;
  if (index === colorStops.length - 1) {
    // Adding row to end of list.
    if (index !== 0) {
      const prevStop = colorStops[index - 1].stop as number;
      delta = currentStop - prevStop;
    }
  } else {
    // Adding row in middle of list.
    const nextStop = colorStops[index + 1].stop as number;
    delta = (nextStop - currentStop) / 2;
  }
  const nextValue = currentStop + delta;
  return addRow(colorStops, index, nextValue);
}

export function addCategoricalRow(colorStops: ColorStop[], index: number) {
  // TODO load value from suggestions
  return addRow(colorStops, index, '');
}

function addRow(colorStops: ColorStop[], index: number, nextValue: StopValue): ColorStop[] {
  const nextColorIndex =
    colorStops.length < DEFAULT_CUSTOM_PALETTE.length
      ? colorStops.length
      : colorStops.length % DEFAULT_CUSTOM_PALETTE.length;
  const newRow = {
    stop: nextValue,
    color: DEFAULT_CUSTOM_PALETTE[nextColorIndex],
  };
  return [...colorStops.slice(0, index + 1), newRow, ...colorStops.slice(index + 1)];
}

export function isColorInvalid(color: string) {
  return !isValidHex(color) || color === '';
}

export function isOrdinalStopInvalid(stop: StopValue) {
  return stop === '' || isNaN(stop as number);
}

export function isCategoricalStopsInvalid(colorStops: ColorStop[]) {
  const nonDefaults = colorStops.slice(1); //
  const values = nonDefaults.map((stop) => stop.stop);
  const uniques = _.uniq(values);
  return values.length !== uniques.length;
}

export function isOrdinalStopsInvalid(colorStops: ColorStop[]) {
  return colorStops.some((colorStop, index) => {
    // expect stops to be in ascending order
    let isDescending = false;
    if (index !== 0) {
      const prevStop = colorStops[index - 1].stop as number;
      isDescending = prevStop >= (colorStop.stop as number);
    }

    return isColorInvalid(colorStop.color) || isOrdinalStopInvalid(colorStop.stop) || isDescending;
  });
}
