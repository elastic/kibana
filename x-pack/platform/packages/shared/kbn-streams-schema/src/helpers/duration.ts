/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const ES_UNIT_TO_MOMENT: Record<string, moment.unitOfTime.DurationConstructor> = {
  ms: 'milliseconds',
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
};

export function parseEsTimeValueInMs(value: string): number | undefined {
  const unit = Object.keys(ES_UNIT_TO_MOMENT).find((u) => value.endsWith(u));
  if (!unit) {
    return undefined;
  }

  const numericPart = value.slice(0, -unit.length);
  const numericValue = Number(numericPart);

  if (isNaN(numericValue) || numericPart.length === 0) {
    return undefined;
  }

  const momentUnit = ES_UNIT_TO_MOMENT[unit];
  return moment.duration(numericValue, momentUnit).asMilliseconds();
}

export function parseEsTimeValueInSeconds(value: string): number | undefined {
  const ms = parseEsTimeValueInMs(value);
  return ms !== undefined ? ms / 1000 : undefined;
}
