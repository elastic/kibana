/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { selectMonitorStatusAlert } from '../../../state/selectors';
import { AlertMonitorStatusComponent } from '../../functional';

interface Props {
  autocomplete: any;
  enabled: boolean;
  numTimes: number;
  setAlertParams: (key: string, value: any) => void;
  timerange: {
    from: string;
    to: string;
  };
}

export const AlertMonitorStatus = ({
  autocomplete,
  enabled,
  numTimes,
  setAlertParams,
  timerange,
}: Props) => {
  const { filters, locations } = useSelector(selectMonitorStatusAlert);
  return (
    <AlertMonitorStatusComponent
      autocomplete={autocomplete}
      enabled={enabled}
      filters={filters}
      locations={locations}
      numTimes={numTimes}
      setAlertParams={setAlertParams}
      timerange={timerange}
    />
  );
};
