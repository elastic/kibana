/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { Moment } from 'moment';
import { momentObj } from 'react-moment-proptypes';
import { EuiDatePicker } from '@elastic/eui';
import { DatetimeInput } from '../datetime_input';

export interface Props {
  /** Selected date (Moment date object) */
  value?: Moment;
  /** Function invoked when a date is selected from the datepicker */
  onSelect: (date: Moment | null) => void;
  /** Function invoked when the date text input changes */
  onValueChange: (moment: Moment) => void; // Called with a moment
  /** Start date of selected date range (Moment date object) */
  startDate?: Moment;
  /** End date of selected date range (Moment date object) */
  endDate?: Moment;
  /** Earliest selectable date (Moment date object) */
  minDate?: Moment;
  /** Latest selectable date (Moment date object) */
  maxDate?: Moment;
}

export const DatetimeCalendar: FunctionComponent<Props> = ({
  value,
  onValueChange,
  onSelect,
  startDate,
  endDate,
  minDate,
  maxDate,
}) => (
  <div className="canvasDateTimeCal">
    <DatetimeInput moment={value} setMoment={onValueChange} />
    <EuiDatePicker
      inline
      showTimeSelect
      shadow={false}
      selected={value && value.isValid() ? value : null}
      onChange={onSelect}
      shouldCloseOnSelect={false}
      startDate={startDate}
      endDate={endDate}
      minDate={minDate}
      maxDate={maxDate}
    />
  </div>
);

DatetimeCalendar.propTypes = {
  value: PropTypes.oneOfType([momentObj, PropTypes.object]), // Handle both valid and invalid moment objects
  onSelect: PropTypes.func.isRequired,
  onValueChange: PropTypes.func.isRequired, // Called with a moment
  startDate: momentObj,
  endDate: momentObj,
  minDate: momentObj,
  maxDate: momentObj,
};
