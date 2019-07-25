/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React, { Fragment, FC, useContext, useState, useEffect } from 'react';
import { EuiDatePickerRange, EuiDatePicker } from '@elastic/eui';

import theme from '@elastic/eui/dist/eui_theme_light.json';

import { KibanaContext, isKibanaContext } from '../../../../../data_frame/common/kibana_context';

const euiSize = +theme.euiSize.replace('px', '');
const WIDTH = `${euiSize * 32}px`;

interface Props {
  setStart: (s: number) => void;
  setEnd: (e: number) => void;
  start: number;
  end: number;
}

type Moment = moment.Moment;

export const TimeRangePicker: FC<Props> = ({ setStart, setEnd, start, end }) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }
  const dateFormat = kibanaContext.kibanaConfig.get('dateFormat');

  const [startMoment, setStartMoment] = useState<Moment | undefined>(moment(start));
  const [endMoment, setEndMoment] = useState<Moment | undefined>(moment(end));

  function handleChangeStart(date: Moment | null) {
    setStartMoment(date || undefined);
  }

  function handleChangeEnd(date: Moment | null) {
    setEndMoment(date || undefined);
  }

  // update the parent start and end if the timepicker changes
  useEffect(() => {
    if (startMoment !== undefined && endMoment !== undefined) {
      setStart(startMoment.valueOf());
      setEnd(endMoment.valueOf());
    }
  }, [startMoment, endMoment]);

  // update our local start and end moment objects if
  // the parent start and end updates.
  // this happens if the use full data button is pressed.
  useEffect(() => {
    setStartMoment(moment(start));
    setEndMoment(moment(end));
  }, [start, end]);

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
            />
          }
        />
      </div>
    </Fragment>
  );
};
