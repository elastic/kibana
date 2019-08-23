/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import * as React from 'react';
import { pure } from 'recompose';

import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_TZ,
  DEFAULT_TIMEZONE_BROWSER,
} from '../../../common/constants';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { getOrEmptyTagFromValue } from '../empty_value';
import { LocalizedDateTooltip } from '../localized_date_tooltip';
import { getMaybeDate } from './maybe_date';

export const PreferenceFormattedDate = pure<{ value: Date }>(({ value }) => {
  const [dateFormat] = useKibanaUiSetting(DEFAULT_DATE_FORMAT);
  const [dateFormatTz] = useKibanaUiSetting(DEFAULT_DATE_FORMAT_TZ);
  const [timezone] = useKibanaUiSetting(DEFAULT_TIMEZONE_BROWSER);

  return (
    <>
      {dateFormat && dateFormatTz && timezone
        ? moment.tz(value, dateFormatTz === 'Browser' ? timezone : dateFormatTz).format(dateFormat)
        : moment.utc(value).toISOString()}
    </>
  );
});

PreferenceFormattedDate.displayName = 'PreferenceFormattedDate';

/**
 * Renders the specified date value in a format determined by the user's preferences,
 * with a tooltip that renders:
 * - the name of the field
 * - a humanized relative date (e.g. 16 minutes ago)
 * - a long representation of the date that includes the day of the week (e.g. Thursday, March 21, 2019 6:47pm)
 * - the raw date value (e.g. 2019-03-22T00:47:46Z)
 */
export const FormattedDate = pure<{
  fieldName: string;
  value?: string | number | null;
}>(
  ({ value, fieldName }): JSX.Element => {
    if (value == null) {
      return getOrEmptyTagFromValue(value);
    }
    const maybeDate = getMaybeDate(value);
    return maybeDate.isValid() ? (
      <LocalizedDateTooltip date={maybeDate.toDate()} fieldName={fieldName}>
        <PreferenceFormattedDate value={maybeDate.toDate()} />
      </LocalizedDateTooltip>
    ) : (
      getOrEmptyTagFromValue(value)
    );
  }
);

FormattedDate.displayName = 'FormattedDate';
