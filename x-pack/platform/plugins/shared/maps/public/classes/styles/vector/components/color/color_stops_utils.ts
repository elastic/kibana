/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidHex, euiPaletteColorBlind } from '@elastic/eui';
import _ from 'lodash';
import type {
  CategoryColorStop,
  OrdinalColorStop,
} from '../../../../../../common/descriptor_types';

const DEFAULT_CUSTOM_PALETTE = euiPaletteColorBlind({ rotations: 3 });

export const DEFAULT_CUSTOM_COLOR = DEFAULT_CUSTOM_PALETTE[0];

export function removeRow<T>(colorStops: T[], index: number) {
  if (colorStops.length === 1) {
    return colorStops;
  }

  return [...colorStops.slice(0, index), ...colorStops.slice(index + 1)];
}

export function addOrdinalRow(colorStops: OrdinalColorStop[], index: number) {
  const currentStop = colorStops[index].stop;
  let delta = 1;
  if (index === colorStops.length - 1) {
    // Adding row to end of list.
    if (index !== 0) {
      const prevStop = colorStops[index - 1].stop;
      delta = currentStop - prevStop;
    }
  } else {
    // Adding row in middle of list.
    const nextStop = colorStops[index + 1].stop;
    delta = (nextStop - currentStop) / 2;
  }
  const nextValue = currentStop + delta;
  return addRow<OrdinalColorStop>(colorStops, index, (color) => ({ stop: nextValue, color }));
}

export function addCategoricalRow(colorStops: CategoryColorStop[], index: number) {
  // TODO load value from suggestions
  return addRow<CategoryColorStop>(colorStops, index, (color) => ({ stop: '', color }));
}

function addRow<T>(colorStops: T[], index: number, createRow: (color: string) => T): T[] {
  const nextColorIndex =
    colorStops.length < DEFAULT_CUSTOM_PALETTE.length
      ? colorStops.length
      : colorStops.length % DEFAULT_CUSTOM_PALETTE.length;
  const newRow = createRow(DEFAULT_CUSTOM_PALETTE[nextColorIndex]);
  return [...colorStops.slice(0, index + 1), newRow, ...colorStops.slice(index + 1)];
}

export function isColorInvalid(color: string) {
  return !isValidHex(color) || color === '';
}

export function isOrdinalStopInvalid(stop: OrdinalColorStop['stop']) {
  // stop is '' when input is empty (see ColorStopsOrdinal)
  return typeof stop !== 'number' || isNaN(stop);
}

export function isCategoricalStopsInvalid(colorStops: CategoryColorStop[]) {
  const nonDefaults = colorStops.slice(1); //
  const values = nonDefaults.map((stop) => stop.stop);
  const uniques = _.uniq(values);
  return values.length !== uniques.length;
}

export function isOrdinalStopsInvalid(colorStops: OrdinalColorStop[]) {
  return colorStops.some((colorStop, index) => {
    // expect stops to be in ascending order
    let isDescending = false;
    if (index !== 0) {
      isDescending = colorStops[index - 1].stop >= colorStop.stop;
    }

    return isColorInvalid(colorStop.color) || isOrdinalStopInvalid(colorStop.stop) || isDescending;
  });
}
