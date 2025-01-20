/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';

export function convertISODateToNanoPrecision(date: string): string {
  const dateParts = date.split('.');

  const fractionSeconds = dateParts.length === 2 ? dateParts[1].replace('Z', '') : '';
  const fractionSecondsInNanos =
    fractionSeconds.length !== 9 ? fractionSeconds.padEnd(9, '0') : fractionSeconds;

  return `${dateParts[0]}.${fractionSecondsInNanos}Z`;
}

export function subtractMillisecondsFromDate(date: string, milliseconds: number): string {
  const dateInNano = convertISODateToNanoPrecision(date);

  const dateParts = dateInNano.split('.');
  const nanoPart = dateParts[1].substring(3, dateParts[1].length); // given 123456789Z => 456789Z

  const isoDate = dateMath.parse(date)?.subtract(milliseconds, 'ms').toISOString();

  return `${isoDate?.replace('Z', nanoPart)}`;
}
