/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// add commas to large numbers
// Number.toLocaleString is not supported on safari
export function toLocaleString(x: number | undefined | null): string {
  if (x === undefined || x === null) {
    return '';
  }
  let result = x.toString();
  if (x && typeof x === 'number') {
    const parts = x.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    result = parts.join('.');
  }
  return result;
}
