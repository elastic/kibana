/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
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

export const getTimeFormatter: TimeFormatterBuilder = memoize((max: number) => {
  const unit = timeUnit(max);
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
});

export function timeUnit(max: number) {
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

export function asTime(
  value: FormatterValue,
  { withUnit = true, defaultValue = NOT_AVAILABLE_LABEL }: FormatterOptions = {}
) {
  if (value == null) {
    return defaultValue;
  }
  const formatter = getTimeFormatter(value);
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
