/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { splitTimeValue } from '../../common/time_value';

const boostFormat = new Intl.NumberFormat(i18n.getLocale(), { maximumFractionDigits: 2 });

export const formatBoost = (boost: number): string => boostFormat.format(boost);

export const formatStorageSize = (bytes?: number): string =>
  bytes === undefined ? '—' : numeral(bytes).format('0.[0] b');

const TIME_UNIT_FORMATTERS: Readonly<Record<string, (count: number) => string>> = {
  d: (count) =>
    i18n.translate('xpack.searchBoost.timeUnits.days', {
      defaultMessage: '{count, plural, one {# day} other {# days}}',
      values: { count },
    }),
  h: (count) =>
    i18n.translate('xpack.searchBoost.timeUnits.hours', {
      defaultMessage: '{count, plural, one {# hour} other {# hours}}',
      values: { count },
    }),
  m: (count) =>
    i18n.translate('xpack.searchBoost.timeUnits.minutes', {
      defaultMessage: '{count, plural, one {# minute} other {# minutes}}',
      values: { count },
    }),
  s: (count) =>
    i18n.translate('xpack.searchBoost.timeUnits.seconds', {
      defaultMessage: '{count, plural, one {# second} other {# seconds}}',
      values: { count },
    }),
  ms: (count) =>
    i18n.translate('xpack.searchBoost.timeUnits.milliseconds', {
      defaultMessage: '{count, plural, one {# millisecond} other {# milliseconds}}',
      values: { count },
    }),
  micros: (count) =>
    i18n.translate('xpack.searchBoost.timeUnits.microseconds', {
      defaultMessage: '{count, plural, one {# microsecond} other {# microseconds}}',
      values: { count },
    }),
  nanos: (count) =>
    i18n.translate('xpack.searchBoost.timeUnits.nanoseconds', {
      defaultMessage: '{count, plural, one {# nanosecond} other {# nanoseconds}}',
      values: { count },
    }),
};

/** Such as "36 hours" for "36h"; values without a unit are shown as they are. */
export const formatDuration = (value: string): string => {
  const parsed = splitTimeValue(value);
  const format = parsed && TIME_UNIT_FORMATTERS[parsed.unit];
  return parsed && format ? format(parsed.size) : value;
};
