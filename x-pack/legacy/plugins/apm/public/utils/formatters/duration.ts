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
  [timeUnit: string]: {
    label: string;
    defaultLabel: string;
    convert: (value: number) => string;
  };
}

const durationUnit: DurationTimeUnit = {
  hours: {
    label: 'xpack.apm.formatters.hoursTimeUnitLabel',
    defaultLabel: 'h',
    convert: (value: number) =>
      asDecimal(moment.duration(value / 1000).asHours())
  },
  minutes: {
    label: 'xpack.apm.formatters.minutesTimeUnitLabel',
    defaultLabel: 'min',
    convert: (value: number) =>
      asDecimal(moment.duration(value / 1000).asMinutes())
  },
  seconds: {
    label: 'xpack.apm.formatters.secondsTimeUnitLabel',
    defaultLabel: 's',
    convert: (value: number) =>
      asDecimal(moment.duration(value / 1000).asSeconds())
  },
  milliseconds: {
    label: 'xpack.apm.formatters.millisTimeUnitLabel',
    defaultLabel: 'ms',
    convert: (value: number) =>
      asInteger(moment.duration(value / 1000).asMilliseconds())
  },
  microseconds: {
    label: 'xpack.apm.formatters.microsTimeUnitLabel',
    defaultLabel: 'μs',
    convert: (value: number) => asInteger(value)
  }
};

function convertTo(
  timeUnit: string,
  value: Maybe<number>,
  withUnit: boolean,
  defaultValue: string
) {
  const unit = durationUnit[timeUnit];
  if (!unit || value == null) {
    return defaultValue;
  }

  const message =
    SPACE +
    i18n.translate(unit.label, {
      defaultMessage: unit.defaultLabel
    });

  const convertedValue = unit.convert(value);
  return `${convertedValue}${withUnit ? message : ''}`;
}

export const asHours = (
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) => convertTo('hours', value, withUnit, defaultValue);

export const asMinutes = (
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) => convertTo('minutes', value, withUnit, defaultValue);

export const asSeconds = (
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) => convertTo('seconds', value, withUnit, defaultValue);

export const asMillis = (
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) => convertTo('milliseconds', value, withUnit, defaultValue);

export const asMicros = (
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) => convertTo('microseconds', value, withUnit, defaultValue);

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
  value: Maybe<number>,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }
  const formatter = getDurationFormatter(value);
  return formatter(value, { withUnit, defaultValue });
}
