/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { Moment } from 'moment';
import { momentObj } from 'react-moment-proptypes';
import { DatetimeCalendar } from '../datetime_calendar';

interface Props {
  /** Optional initial start date moment */
  from?: Moment;
  /** Optional initial end date moment */
  to?: Moment;

  /** Function invoked when a date is selected from the datetime calendar */
  onSelect: (from?: Moment, to?: Moment) => void;
}

export const DatetimeRangeAbsolute: FunctionComponent<Props> = ({ from, to, onSelect }) => (
  <div className="canvasDateTimeRangeAbsolute">
    <div>
      <DatetimeCalendar
        value={from}
        startDate={from}
        endDate={to}
        maxDate={to}
        onValueChange={val => onSelect(val, to)}
        onSelect={val => {
          if (!val || !from) {
            return;
          }

          // sets the time to start of day if only the date was selected
          if (from.format('hh:mm:ss a') === val.format('hh:mm:ss a')) {
            onSelect(val.startOf('day'), to);
          } else {
            onSelect(val, to);
          }
        }}
      />
    </div>
    <div>
      <DatetimeCalendar
        value={to}
        startDate={from}
        endDate={to}
        minDate={from}
        onValueChange={val => onSelect(from, val)}
        onSelect={val => {
          if (!val || !to) {
            return;
          }

          // set the time to end of day if only the date was selected
          if (to.format('hh:mm:ss a') === val.format('hh:mm:ss a')) {
            onSelect(from, val.endOf('day'));
          } else {
            onSelect(from, val);
          }
        }}
      />
    </div>
  </div>
);

DatetimeRangeAbsolute.propTypes = {
  from: momentObj,
  to: momentObj,
  onSelect: PropTypes.func.isRequired,
};
