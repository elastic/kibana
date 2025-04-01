/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import numeral from '@elastic/numeral';

export function getFormattedSuccessRatio(successRatio: number) {
  const formatted = numeral(successRatio! * 100).format('0,0');
  return `${formatted}%`;
}

export function getFormattedDuration(value: number) {
  if (!value) {
    return '00:00';
  }

  const duration = moment.duration(value);
  let minutes = Math.floor(duration.asMinutes());
  let seconds = duration.seconds();
  const ms = duration.milliseconds();

  if (ms >= 500) {
    seconds += 1;
    if (seconds === 60) {
      seconds = 0;
      minutes += 1;
    }
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function getFormattedMilliseconds(value: number) {
  const formatted = numeral(value).format('0,0');
  return `${formatted} ms`;
}
