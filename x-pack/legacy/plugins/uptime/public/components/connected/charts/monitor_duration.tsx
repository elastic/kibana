/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUrlParams } from '../../../hooks';
import { getMonitorDurationAction } from '../../../state/actions';
import { DurationChartComponent } from '../../functional/charts';
import { selectDurationLines } from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';

interface Props {
  monitorId: string;
}

export const DurationChart: React.FC<Props> = ({ monitorId }: Props) => {
  const [getUrlParams] = useUrlParams();
  const { dateRangeStart, dateRangeEnd } = getUrlParams();

  const { monitor_duration, loading } = useSelector(selectDurationLines);

  const dispatch = useDispatch();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  useEffect(() => {
    dispatch(
      getMonitorDurationAction({ monitorId, dateStart: dateRangeStart, dateEnd: dateRangeEnd })
    );
  }, [dateRangeStart, dateRangeEnd, dispatch, lastRefresh, monitorId]);

  return (
    <DurationChartComponent
      locationDurationLines={monitor_duration?.locationDurationLines ?? []}
      loading={loading}
    />
  );
};
