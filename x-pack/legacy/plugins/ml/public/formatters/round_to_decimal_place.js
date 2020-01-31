/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function roundToDecimalPlace(num, dp = 2) {
  if (Math.abs(num) < Math.pow(10, -dp)) {
    return Number.parseFloat(num).toExponential(2);
  } else {
    const m = Math.pow(10, dp);
    return Math.round(num * m) / m;
  }
}
