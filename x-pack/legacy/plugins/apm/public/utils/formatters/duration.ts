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

interface FormatterOptions {
  defaultValue?: string;
}

type DurationTimeUnit = TimeUnit | 'microseconds';

interface DurationUnit {
  [unit: string]: {
    label: string;
    convert: (value: number) => { value: string; convertedValue: number };
  };
}

interface ConvertedDuration {
  value: string;
  unit?: string;
  formatted: string;
  convertedValue?: number;
}

export type TimeFormatter = (
  value: Maybe<number>,
  options?: FormatterOptions
) => ConvertedDuration;

type TimeFormatterBuilder = (max: number) => TimeFormatter;

const durationUnit: DurationUnit = {
  hours: {
    label: i18n.translate('xpack.apm.formatters.hoursTimeUnitLabel', {
      defaultMessage: 'h'
    }),
    convert: (microseconds: number) => {
      const hours = moment.duration(microseconds / 1000).asHours();
      return { value: asDecimal(hours), convertedValue: Math.round(hours) };
    }
  },
  minutes: {
    label: i18n.translate('xpack.apm.formatters.minutesTimeUnitLabel', {
      defaultMessage: 'min'
    }),
    convert: (microseconds: number) => {
      const minutes = moment.duration(microseconds / 1000).asMinutes();
      return { value: asDecimal(minutes), convertedValue: Math.round(minutes) };
    }
  },
  seconds: {
    label: i18n.translate('xpack.apm.formatters.secondsTimeUnitLabel', {
      defaultMessage: 's'
    }),
    convert: (microseconds: number) => {
      const seconds = moment.duration(microseconds / 1000).asSeconds();
      return { value: asDecimal(seconds), convertedValue: Math.round(seconds) };
    }
  },
  milliseconds: {
    label: i18n.translate('xpack.apm.formatters.millisTimeUnitLabel', {
      defaultMessage: 'ms'
    }),
    convert: (microseconds: number) => {
      const milliseconds = moment
        .duration(microseconds / 1000)
        .asMilliseconds();
      return {
        value: asInteger(milliseconds),
        convertedValue: Math.round(milliseconds)
      };
    }
  },
  microseconds: {
    label: i18n.translate('xpack.apm.formatters.microsTimeUnitLabel', {
      defaultMessage: 'μs'
    }),
    convert: (microseconds: number) => ({
      value: asInteger(microseconds),
      convertedValue: microseconds
    })
  }
};

/**
 * Converts a microseconds value into the unit defined.
 *
 * @param param0
 * { unit: "milliseconds" | "hours" | "minutes" | "seconds" | "microseconds", microseconds, defaultValue }
 *
 * @returns object { value, unit, formatted }
 */
export function convertTo({
  unit,
  microseconds,
  defaultValue = NOT_AVAILABLE_LABEL
}: {
  unit: DurationTimeUnit;
  microseconds: Maybe<number>;
  defaultValue?: string;
}): ConvertedDuration {
  const duration = durationUnit[unit];
  if (!duration || microseconds == null) {
    return { value: defaultValue, formatted: defaultValue };
  }

  const { value, convertedValue } = duration.convert(microseconds);
  return {
    value,
    unit: duration.label,
    formatted: `${value} ${duration.label}`,
    convertedValue
  };
}

export const toMicroseconds = (value: number, timeUnit: TimeUnit) =>
  moment.duration(value, timeUnit).asMilliseconds() * 1000;

function getDurationUnitKey(max: number): DurationTimeUnit {
  if (max > toMicroseconds(1, 'hours')) {
    return 'hours';
  }
  if (max > toMicroseconds(1, 'minutes')) {
    return 'minutes';
  }
  if (max > toMicroseconds(10, 'seconds')) {
    return 'seconds';
  }
  if (max > toMicroseconds(10, 'milliseconds')) {
    return 'milliseconds';
  }
  return 'microseconds';
}

export const getDurationFormatter: TimeFormatterBuilder = memoize(
  (max: number) => {
    const unit = getDurationUnitKey(max);
    return (value, { defaultValue }: FormatterOptions = {}) => {
      return convertTo({ unit, microseconds: value, defaultValue });
    };
  }
);

/**
 * Converts value and returns it formatted - 00 unit
 *
 * @param value
 * @param param1 { defaultValue }
 * @returns formated value - 00 unit
 */
export function asDuration(
  value: Maybe<number>,
  { defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }

  const formatter = getDurationFormatter(value);
  return formatter(value, { defaultValue }).formatted;
}
