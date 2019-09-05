/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UnitStrings } from '../../i18n';

const { time: strings } = UnitStrings;

type Format = 'days' | 'hours' | 'minutes' | 'seconds';

export const timeDurationString = (time: number, format?: Format) => {
  const seconds = time / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  if (format === 'days' || days >= 1) {
    return strings.getDaysText(days);
  }
  if (format === 'hours' || hours >= 1) {
    return strings.getHoursText(hours);
  }
  if (format === 'minutes' || minutes >= 1) {
    return strings.getMinutesText(minutes);
  }

  return strings.getSecondsText(seconds);
};
