/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUrlParams } from '../../../hooks';
import { anomalyRecordsAction, getMonitorDurationAction } from '../../../state/actions';
import { DurationChartComponent } from '../../functional/charts';
import { anomaliesSelector, selectDurationLines } from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';

interface Props {
  monitorId: string;
}

export const DurationChart: React.FC<Props> = ({ monitorId }: Props) => {
  const [getUrlParams] = useUrlParams();
  const {
    dateRangeStart,
    dateRangeEnd,
    absoluteDateRangeStart,
    absoluteDateRangeEnd,
  } = getUrlParams();

  const { monitor_duration, loading } = useSelector(selectDurationLines);

  const anomalies = useSelector(anomaliesSelector);

  const dispatch = useDispatch();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  useEffect(() => {
    const params = { monitorId, dateStart: dateRangeStart, dateEnd: dateRangeEnd };
    dispatch(getMonitorDurationAction(params));
    const anomalyParams = {
      monitorId,
      dateStart: absoluteDateRangeStart,
      dateEnd: absoluteDateRangeEnd,
    };

    dispatch(anomalyRecordsAction.get(anomalyParams));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRangeStart, dateRangeEnd, dispatch, lastRefresh, monitorId]);

  return (
    <DurationChartComponent
      anomalies={anomalies}
      loading={loading}
      locationDurationLines={monitor_duration?.locationDurationLines ?? []}
    />
  );
};
