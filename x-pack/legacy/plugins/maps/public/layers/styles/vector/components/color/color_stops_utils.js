/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidHex } from '@elastic/eui';

export function removeRow(colorStops, index) {
  if (colorStops.length === 1) {
    return colorStops;
  }

  return [...colorStops.slice(0, index), ...colorStops.slice(index + 1)];
}

export function addRow(colorStops, index) {
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

  const newRow = {
    stop: currentStop + delta,
    color: '#FF0000',
  };
  return [...colorStops.slice(0, index + 1), newRow, ...colorStops.slice(index + 1)];
}

export function isColorInvalid(color) {
  return !isValidHex(color) || color === '';
}

export function isStopInvalid(stop) {
  return stop === '' || isNaN(stop);
}

export function isInvalid(colorStops) {
  return colorStops.some((colorStop, index) => {
    // expect stops to be in ascending order
    let isDescending = false;
    if (index !== 0) {
      const prevStop = colorStops[index - 1].stop;
      isDescending = prevStop >= colorStop.stop;
    }

    return isColorInvalid(colorStop.color) || isStopInvalid(colorStop.stop) || isDescending;
  });
}
