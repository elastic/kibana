/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import React from 'react';
import { FormattedRelative } from '@kbn/i18n-react';

import { useDateFormat, useTimeZone, useUiSetting$ } from '../../common/lib/kibana';
import { getOrEmptyTagFromValue } from '../empty_value';
import { LocalizedDateTooltip } from '../localized_date_tooltip';
import { getMaybeDate } from './maybe_date';

export const PreferenceFormattedDate = React.memo<{
  dateFormat?: string;
  value: Date;
  stripMs?: boolean;
}>(({ value, dateFormat, stripMs = false }) => {
  const systemDateFormat = useDateFormat();
  const toUseDateFormat = dateFormat ? dateFormat : systemDateFormat;
  const strippedDateFormat =
    toUseDateFormat && stripMs ? toUseDateFormat.replace(/\.?SSS/, '') : toUseDateFormat;
  return <>{moment.tz(value, useTimeZone()).format(strippedDateFormat)}</>;
});

PreferenceFormattedDate.displayName = 'PreferenceFormattedDate';

export const PreferenceFormattedDateFromPrimitive = ({
  value,
}: {
  value?: string | number | null;
}) => {
  if (value == null) {
    return getOrEmptyTagFromValue(value);
  }
  const maybeDate = getMaybeDate(value);
  if (!maybeDate.isValid()) {
    return getOrEmptyTagFromValue(value);
  }
  const date = maybeDate.toDate();
  return <PreferenceFormattedDate value={date} />;
};

PreferenceFormattedDateFromPrimitive.displayName = 'PreferenceFormattedDateFromPrimitive';

/**
 * This function may be passed to `Array.find()` to locate the `P1DT`
 * configuration (sub) setting, a string array that contains two entries
 * like the following example: `['P1DT', 'YYYY-MM-DD']`.
 */
export const isP1DTFormatterSetting = (formatNameFormatterPair?: string[]) =>
  Array.isArray(formatNameFormatterPair) &&
  formatNameFormatterPair[0] === 'P1DT' &&
  formatNameFormatterPair.length === 2;

/**
 * Renders a date in `P1DT` format, e.g. `YYYY-MM-DD`, as specified by
 * the `P1DT1` entry in the `dateFormat:scaled` Kibana Advanced setting.
 *
 * If the `P1DT` format is not specified in the `dateFormat:scaled` setting,
 * the fallback format `YYYY-MM-DD` will be applied
 */
export const PreferenceFormattedP1DTDate = React.memo<{ value: Date }>(({ value }) => {
  /**
   * A fallback "format name / formatter" 2-tuple for the `P1DT` formatter, which is
   * one of many such pairs expected to be contained in the `dateFormat:scaled`
   * Kibana advanced setting.
   */
  const FALLBACK_DATE_FORMAT_SCALED_P1DT = ['P1DT', 'YYYY-MM-DD'];

  // Read the 'dateFormat:scaled' Kibana Advanced setting, which contains 2-tuple sub-settings:
  const [scaledDateFormatPreference] = useUiSetting$<string[][]>('dateFormat:scaled');

  // attempt to find the nested `['P1DT', 'formatString']` setting
  const maybeP1DTFormatter = Array.isArray(scaledDateFormatPreference)
    ? scaledDateFormatPreference.find(isP1DTFormatterSetting)
    : null;

  const p1dtFormat =
    Array.isArray(maybeP1DTFormatter) && maybeP1DTFormatter.length === 2
      ? maybeP1DTFormatter[1]
      : FALLBACK_DATE_FORMAT_SCALED_P1DT[1];

  return <PreferenceFormattedDate dateFormat={p1dtFormat} value={value} />;
});

PreferenceFormattedP1DTDate.displayName = 'PreferenceFormattedP1DTDate';

/**
 * Renders the specified date value in a format determined by the user's preferences,
 * with a tooltip that renders:
 * - the name of the field
 * - a humanized relative date (e.g. 16 minutes ago)
 * - a long representation of the date that includes the day of the week (e.g. Thursday, March 21, 2019 6:47pm)
 * - the raw date value (e.g. 2019-03-22T00:47:46Z)
 */
export const FormattedDate = React.memo<{
  fieldName?: string;
  value?: string | number | null;
  className?: string;
}>(({ value, fieldName, className = '' }): JSX.Element => {
  if (value == null) {
    return getOrEmptyTagFromValue(value);
  }
  const maybeDate = getMaybeDate(value);
  return maybeDate.isValid() ? (
    <LocalizedDateTooltip date={maybeDate.toDate()} fieldName={fieldName} className={className}>
      <PreferenceFormattedDate value={maybeDate.toDate()} />
    </LocalizedDateTooltip>
  ) : (
    getOrEmptyTagFromValue(value)
  );
});

FormattedDate.displayName = 'FormattedDate';

/**
 * Renders the specified date value according to under/over one hour
 * Under an hour = relative format
 * Over an hour = in a format determined by the user's preferences,
 * with a tooltip that renders:
 * - the name of the field
 * - a humanized relative date (e.g. 16 minutes ago)
 * - a long representation of the date that includes the day of the week (e.g. Thursday, March 21, 2019 6:47pm)
 * - the raw date value (e.g. 2019-03-22T00:47:46Z)
 * @param value -  raw date
 * @param  stripMs - strip milliseconds when formatting time (remove ".SSS" from the date format)
 */
export const FormattedRelativePreferenceDate = ({
  value,
  stripMs = false,
}: {
  value?: string | number | null;
  stripMs?: boolean;
}) => {
  if (value == null) {
    return getOrEmptyTagFromValue(value);
  }
  const maybeDate = getMaybeDate(value);
  if (!maybeDate.isValid()) {
    return getOrEmptyTagFromValue(value);
  }
  const date = maybeDate.toDate();
  return (
    <LocalizedDateTooltip date={date}>
      {moment(date).add(1, 'hours').isBefore(new Date()) ? (
        <PreferenceFormattedDate data-test-subj="preference-time" value={date} stripMs={stripMs} />
      ) : (
        <FormattedRelative data-test-subj="relative-time" value={date} />
      )}
    </LocalizedDateTooltip>
  );
};
FormattedRelativePreferenceDate.displayName = 'FormattedRelativePreferenceDate';

/**
 * Renders a preceding label according to under/over one hour
 */

export const FormattedRelativePreferenceLabel = ({
  value,
  preferenceLabel,
  relativeLabel,
}: {
  value?: string | number | null;
  preferenceLabel?: string | null;
  relativeLabel?: string | null;
}) => {
  if (value == null) {
    return null;
  }
  const maybeDate = getMaybeDate(value);
  if (!maybeDate.isValid()) {
    return null;
  }
  return moment(maybeDate.toDate()).add(1, 'hours').isBefore(new Date()) ? (
    <>{preferenceLabel}</>
  ) : (
    <>{relativeLabel}</>
  );
};
FormattedRelativePreferenceLabel.displayName = 'FormattedRelativePreferenceLabel';
