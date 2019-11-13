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
import { Maybe } from '../../../typings/common';

const SPACE = ' ';

interface FormatterOptions {
  withUnit?: boolean;
  defaultValue?: string;
}

interface DurationTimeUnit {
  [unit: string]: {
    label: string;
    convert: (value: number) => string;
  };
}

const durationUnit: DurationTimeUnit = {
  hours: {
    label: i18n.translate('xpack.apm.formatters.hoursTimeUnitLabel', {
      defaultMessage: 'h'
    }),
    convert: (value: number) =>
      asDecimal(moment.duration(value / 1000).asHours())
  },
  minutes: {
    label: i18n.translate('xpack.apm.formatters.minutesTimeUnitLabel', {
      defaultMessage: 'min'
    }),
    convert: (value: number) =>
      asDecimal(moment.duration(value / 1000).asMinutes())
  },
  seconds: {
    label: i18n.translate('xpack.apm.formatters.secondsTimeUnitLabel', {
      defaultMessage: 's'
    }),
    convert: (value: number) =>
      asDecimal(moment.duration(value / 1000).asSeconds())
  },
  milliseconds: {
    label: i18n.translate('xpack.apm.formatters.millisTimeUnitLabel', {
      defaultMessage: 'ms'
    }),
    convert: (value: number) =>
      asInteger(moment.duration(value / 1000).asMilliseconds())
  },
  microseconds: {
    label: i18n.translate('xpack.apm.formatters.microsTimeUnitLabel', {
      defaultMessage: 'μs'
    }),
    convert: (value: number) => asInteger(value)
  }
};

function convertTo({
  unit,
  value,
  withUnit,
  defaultValue
}: {
  unit: TimeUnit | 'microseconds';
  value: Maybe<number>;
  withUnit: boolean;
  defaultValue: string;
}) {
  const duration = durationUnit[unit];
  if (!duration || value == null) {
    return defaultValue;
  }

  const message = SPACE + duration.label;

  const convertedValue = duration.convert(value);
  return `${convertedValue}${withUnit ? message : ''}`;
}

export const asHours = (
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) => convertTo({ unit: 'hours', value, withUnit, defaultValue });

export const asMinutes = (
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) => convertTo({ unit: 'minutes', value, withUnit, defaultValue });

export const asSeconds = (
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) => convertTo({ unit: 'seconds', value, withUnit, defaultValue });

export const asMillis = (
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) => convertTo({ unit: 'milliseconds', value, withUnit, defaultValue });

export const asMicros = (
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) => convertTo({ unit: 'microseconds', value, withUnit, defaultValue });

export type TimeFormatter = (
  value: Maybe<number>,
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
  const toMicroseconds = (value: number, timeUnit: TimeUnit) =>
    moment.duration(value, timeUnit).asMilliseconds() * 1000;

  if (max > toMicroseconds(1, 'hours')) {
    return 'h';
  }
  if (max > toMicroseconds(1, 'minutes')) {
    return 'm';
  }
  if (max > toMicroseconds(10, 'seconds')) {
    return 's';
  }
  if (max > toMicroseconds(10, 'milliseconds')) {
    return 'ms';
  }
  return 'us';
}

export function asDuration(
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }
  const formatter = getDurationFormatter(value);
  return formatter(value, { withUnit, defaultValue });
}
