/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React, { Fragment, FC, useState, useEffect } from 'react';
import { EuiDatePickerRange, EuiDatePicker } from '@elastic/eui';

import { useKibanaContext } from '../../../../../contexts/kibana';
import { TimeRange } from './time_range';

const WIDTH = '512px';

interface Props {
  setTimeRange: (d: TimeRange) => void;
  timeRange: TimeRange;
}

type Moment = moment.Moment;

export const TimeRangePicker: FC<Props> = ({ setTimeRange, timeRange }) => {
  const kibanaContext = useKibanaContext();
  const dateFormat: string = kibanaContext.kibanaConfig.get('dateFormat');

  const [startMoment, setStartMoment] = useState<Moment | undefined>(moment(timeRange.start));
  const [endMoment, setEndMoment] = useState<Moment | undefined>(moment(timeRange.end));

  function handleChangeStart(date: Moment | null) {
    setStartMoment(date || undefined);
  }

  function handleChangeEnd(date: Moment | null) {
    setEndMoment(date || undefined);
  }

  // update the parent start and end if the timepicker changes
  useEffect(() => {
    if (startMoment !== undefined && endMoment !== undefined) {
      setTimeRange({
        start: startMoment.valueOf(),
        end: endMoment.valueOf(),
      });
    }
  }, [startMoment, endMoment]);

  // update our local start and end moment objects if
  // the parent start and end updates.
  // this happens if the use full data button is pressed.
  useEffect(() => {
    setStartMoment(moment(timeRange.start));
    setEndMoment(moment(timeRange.end));
  }, [JSON.stringify(timeRange)]);

  return (
    <Fragment>
      <div style={{ minWidth: WIDTH }}>
        <EuiDatePickerRange
          fullWidth={true}
          startDateControl={
            <EuiDatePicker
              selected={startMoment}
              onChange={handleChangeStart}
              startDate={startMoment}
              endDate={endMoment}
              aria-label="Start date"
              showTimeSelect
              dateFormat={dateFormat}
              maxDate={endMoment}
            />
          }
          endDateControl={
            <EuiDatePicker
              selected={endMoment}
              onChange={handleChangeEnd}
              startDate={startMoment}
              endDate={endMoment}
              aria-label="End date"
              showTimeSelect
              dateFormat={dateFormat}
              minDate={startMoment}
            />
          }
        />
      </div>
    </Fragment>
  );
};
