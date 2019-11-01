/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { memoize } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../common/i18n';

const HOURS_CUT_OFF = 3600000000; // 1 hour (in microseconds)
const MINUTES_CUT_OFF = 60000000; // 1 minute (in microseconds)
const SECONDS_CUT_OFF = 10 * 1000000; // 10 seconds (in microseconds)
const MILLISECONDS_CUT_OFF = 10 * 1000; // 10 milliseconds (in microseconds)
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
    const unit = durationUnit(max);
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

// todo change it to durationUnit
export function durationUnit(max: number) {
  if (max > HOURS_CUT_OFF) {
    return 'h';
  } else if (max > MINUTES_CUT_OFF) {
    return 'm';
  } else if (max > SECONDS_CUT_OFF) {
    return 's';
  } else if (max > MILLISECONDS_CUT_OFF) {
    return 'ms';
  } else {
    return 'us';
  }
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

export function asDecimal(value: number) {
  return numeral(value).format('0,0.0');
}

export function asInteger(value: number) {
  return numeral(value).format('0,0');
}

export function tpmUnit(type?: string) {
  return type === 'request'
    ? i18n.translate('xpack.apm.formatters.requestsPerMinLabel', {
        defaultMessage: 'rpm'
      })
    : i18n.translate('xpack.apm.formatters.transactionsPerMinLabel', {
        defaultMessage: 'tpm'
      });
}

export function asPercent(
  numerator: number,
  denominator: number | undefined,
  fallbackResult = ''
) {
  if (!denominator || isNaN(numerator)) {
    return fallbackResult;
  }

  const decimal = numerator / denominator;
  return numeral(decimal).format('0.0%');
}

function asKilobytes(value: number) {
  return `${asDecimal(value / 1000)} KB`;
}

function asMegabytes(value: number) {
  return `${asDecimal(value / 1e6)} MB`;
}

function asGigabytes(value: number) {
  return `${asDecimal(value / 1e9)} GB`;
}

function asTerabytes(value: number) {
  return `${asDecimal(value / 1e12)} TB`;
}

function asBytes(value: number) {
  return `${asDecimal(value)} B`;
}

const bailIfNumberInvalid = (cb: (val: number) => string) => {
  return (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) {
      return '';
    }
    return cb(val);
  };
};

export const asDynamicBytes = bailIfNumberInvalid((value: number) => {
  return unmemoizedFixedByteFormatter(value)(value);
});

const unmemoizedFixedByteFormatter = (max: number) => {
  if (max > 1e12) {
    return asTerabytes;
  }

  if (max > 1e9) {
    return asGigabytes;
  }

  if (max > 1e6) {
    return asMegabytes;
  }

  if (max > 1000) {
    return asKilobytes;
  }

  return asBytes;
};

export const getFixedByteFormatter = memoize((max: number) => {
  const formatter = unmemoizedFixedByteFormatter(max);

  return bailIfNumberInvalid(formatter);
});

/**
 * Returns the timezone set on momentTime.
 * (UTC+offset) when offset if bigger than 0.
 * (UTC-offset) when offset if lower than 0.
 * @param momentTime Moment
 */
function formatTimezone(momentTime: moment.Moment) {
  const DEFAULT_TIMEZONE_FORMAT = 'Z';

  // Adds plus sign when offsetHours is greater than 0.
  const getCustomTimezoneFormat = (offsetHours: number) =>
    offsetHours > 0 ? `+${offsetHours}` : offsetHours;

  const utcOffsetHours = momentTime.utcOffset() / 60;

  const utcOffsetFormatted = Number.isInteger(utcOffsetHours)
    ? getCustomTimezoneFormat(utcOffsetHours)
    : DEFAULT_TIMEZONE_FORMAT;

  return momentTime.format(`(UTC${utcOffsetFormatted})`);
}

export type TimePrecision = 'hours' | 'minutes' | 'seconds' | 'milliseconds';
function getTimeFormat(precision: TimePrecision) {
  switch (precision) {
    case 'hours':
      return 'HH';
    case 'minutes':
      return 'HH:mm';
    case 'seconds':
      return 'HH:mm:ss';
    case 'milliseconds':
      return 'HH:mm:ss.SSS';
    default:
      return '';
  }
}

type DatePrecision = 'days' | 'months' | 'years';
function getDateFormat(precision: DatePrecision) {
  switch (precision) {
    case 'years':
      return 'YYYY';
    case 'months':
      return 'MMM YYYY';
    case 'days':
      return 'MMM D, YYYY';
    default:
      return '';
  }
}

function getFormatsAccordingToDateDifference(
  momentStart: moment.Moment,
  momentEnd: moment.Moment
) {
  const getDateDifference = (unitOfTime: DatePrecision | TimePrecision) =>
    momentEnd.diff(momentStart, unitOfTime);

  // Difference is greater than or equals to 5 years
  if (getDateDifference('years') >= 5) {
    return { dateFormat: getDateFormat('years') };
  }
  // Difference is greater than or equals to 5 months
  if (getDateDifference('months') >= 5) {
    return { dateFormat: getDateFormat('months') };
  }

  const dateFormat = getDateFormat('days');
  // Difference is greater than 1 day
  if (getDateDifference('days') > 1) {
    return { dateFormat };
  }

  // Difference is greater than or equals to 5 hours
  if (getDateDifference('hours') >= 5) {
    return { dateFormat, timeFormat: getTimeFormat('minutes') };
  }

  // Difference is greater than or equals to 5 minutes
  if (getDateDifference('minutes') >= 5) {
    return { dateFormat, timeFormat: getTimeFormat('seconds') };
  }

  // When difference is in milliseconds
  return { dateFormat, timeFormat: getTimeFormat('milliseconds') };
}

export function asAbsoluteTime({
  time,
  precision = 'milliseconds'
}: {
  time: number;
  precision?: TimePrecision;
}) {
  const momentTime = moment(time);
  const formattedTz = formatTimezone(momentTime);

  return momentTime.format(
    `${getDateFormat('days')}, ${getTimeFormat(precision)} ${formattedTz}`
  );
}

/**
 *
 * Returns the dates formatted according to the difference between the two dates:
 *
 * | Difference     |           Format                               |
 * | -------------- |:----------------------------------------------:|
 * | >= 5 years     | YYYY - YYYY                                    |
 * | >= 5 months    | MMM YYYY - MMM YYYY                            |
 * | > 1 day        | MMM D, YYYY                                    |
 * | >= 5 hours     | MMM D, YYYY, HH:mm - HH:mm (UTC)               |
 * | >= 5 minutes   | MMM D, YYYY, HH:mm:ss - HH:mm:ss (UTC)         |
 * | default        | MMM D, YYYY, HH:mm:ss.SSS - HH:mm:ss.SSS (UTC) |
 *
 * @param start timestamp
 * @param end timestamp
 */
export function asRelativeDateRange(start: number, end: number) {
  const momentStartTime = moment(start);
  const momentEndTime = moment(end);

  const { dateFormat, timeFormat } = getFormatsAccordingToDateDifference(
    momentStartTime,
    momentEndTime
  );

  if (timeFormat) {
    const formattedStartTime = momentStartTime.format(
      `${dateFormat}, ${timeFormat}`
    );
    const formattedEndTime = momentEndTime.format(timeFormat);
    const formattedTz = formatTimezone(momentStartTime);
    return `${formattedStartTime} - ${formattedEndTime} ${formattedTz}`;
  }

  const formattedStartTime = momentStartTime.format(dateFormat);
  const formattedEndTime = momentEndTime.format(dateFormat);
  return `${formattedStartTime} - ${formattedEndTime}`;
}
