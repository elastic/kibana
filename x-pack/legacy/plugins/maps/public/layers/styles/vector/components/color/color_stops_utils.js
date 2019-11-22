/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidHex } from '@elastic/eui';

export function isColorInvalid(color) {
  return !isValidHex(color) || color === '';
}

export function isStopInvalid(stop) {
  return stop === '' || isNaN(stop);
}

export function isInvalid(colorStops) {
  return colorStops.some((colorStop) => {
    return isColorInvalid(colorStop.color) || isStopInvalid(colorStop.stop);
  });
}
