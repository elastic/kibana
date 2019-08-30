/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Examples:
 * roundToNearestFiveOrTen(55) -> 50
 * roundToNearestFiveOrTen(95) -> 100
 * roundToNearestFiveOrTen(384) -> 500
 */
export function roundToNearestFiveOrTen(value: number) {
  const five = Math.pow(10, Math.floor(Math.log10(value))) * 5;
  const ten = Math.pow(10, Math.round(Math.log10(value)));
  return Math.abs(five - value) < Math.abs(ten - value) ? five : ten;
}
