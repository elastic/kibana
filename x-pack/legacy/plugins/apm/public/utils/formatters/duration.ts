/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { memoize } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { asDecimal, asInteger } from './formatters';
import { TimeUnit } from './datetime';

const SPACE = ' ';

/*
 * value: time in microseconds
 * withUnit: add unit suffix
 * defaultValue: value to use if the specified is null/undefined
 */
type FormatterValue = number | undefined | null;
interface FormatterOptions {
  withUnit?: boolean;
  defaultValue?: string;
}

export function asHours(
  value: FormatterValue,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }
  const hoursLabel =
    SPACE +
    i18n.translate('xpack.apm.formatters.hoursTimeUnitLabel', {
      defaultMessage: 'h'
    });
  const formatted = asDecimal(value / 3600000000);
  return `${formatted}${withUnit ? hoursLabel : ''}`;
}

export function asMinutes(
  value: FormatterValue,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }
  const minutesLabel =
    SPACE +
    i18n.translate('xpack.apm.formatters.minutesTimeUnitLabel', {
      defaultMessage: 'min'
    });
  const formatted = asDecimal(value / 60000000);
  return `${formatted}${withUnit ? minutesLabel : ''}`;
}

export function asSeconds(
  value: FormatterValue,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }
  const secondsLabel =
    SPACE +
    i18n.translate('xpack.apm.formatters.secondsTimeUnitLabel', {
      defaultMessage: 's'
    });
  const formatted = asDecimal(value / 1000000);
  return `${formatted}${withUnit ? secondsLabel : ''}`;
}

export function asMillis(
  value: FormatterValue,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }

  const millisLabel =
    SPACE +
    i18n.translate('xpack.apm.formatters.millisTimeUnitLabel', {
      defaultMessage: 'ms'
    });
  const formatted = asInteger(value / 1000);
  return `${formatted}${withUnit ? millisLabel : ''}`;
}

export function asMicros(
  value: FormatterValue,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }

  const microsLabel =
    SPACE +
    i18n.translate('xpack.apm.formatters.microsTimeUnitLabel', {
      defaultMessage: 'μs'
    });
  const formatted = asInteger(value);
  return `${formatted}${withUnit ? microsLabel : ''}`;
}

export type TimeFormatter = (
  value: FormatterValue,
  options?: FormatterOptions
) => string;

type TimeFormatterBuilder = (max: number) => TimeFormatter;

export const getDurationFormatter: TimeFormatterBuilder = memoize(
  (max: number) => {
    const unit = getDurationUnit(max);
    switch (unit) {
      case 'h':
        return asHours;
      case 'm':
        return asMinutes;
      case 's':
        return asSeconds;
      case 'ms':
        return asMillis;
      case 'us':
        return asMicros;
    }
  }
);

export function getDurationUnit(max: number) {
  const toMicroseconds = (timeUnit: TimeUnit, multiplier: number = 1000) =>
    moment.duration(1, timeUnit).asMilliseconds() * multiplier;

  if (max > toMicroseconds('hours')) {
    return 'h';
  }
  if (max > toMicroseconds('minutes')) {
    return 'm';
  }
  if (max > toMicroseconds('seconds', 10000)) {
    return 's';
  }
  if (max > toMicroseconds('seconds', 10)) {
    return 'ms';
  }
  return 'us';
}

export function asDuration(
  value: FormatterValue,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }
  const formatter = getDurationFormatter(value);
  return formatter(value, { withUnit, defaultValue });
}
