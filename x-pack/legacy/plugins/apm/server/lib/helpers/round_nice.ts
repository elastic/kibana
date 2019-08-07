/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function roundNice(v: number) {
  const five = Math.pow(10, Math.floor(Math.log10(v))) * 5;
  const ten = Math.pow(10, Math.round(Math.log10(v)));
  return Math.abs(five - v) < Math.abs(ten - v) ? five : ten;
}
