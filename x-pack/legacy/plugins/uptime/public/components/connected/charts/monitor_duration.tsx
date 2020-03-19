/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUrlParams } from '../../../hooks';
import { getAnomalyRecordsAction, getMonitorDurationAction } from '../../../state/actions';
import { DurationChartComponent } from '../../functional/charts';
import { anomaliesSelector, hasMLJobSelector, selectDurationLines } from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';
import { getMLJobId } from '../../../state/api/ml_anomaly';

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

  const { durationLines, loading } = useSelector(selectDurationLines);

  const { data: mlJobs } = useSelector(hasMLJobSelector);

  const hasMLJob =
    !!mlJobs?.jobsExist &&
    mlJobs.jobs.find((job: any) => job.id === getMLJobId(monitorId as string));

  const anomalies = useSelector(anomaliesSelector);

  const dispatch = useDispatch();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  useEffect(() => {
    const params = { monitorId, dateStart: dateRangeStart, dateEnd: dateRangeEnd };
    dispatch(getMonitorDurationAction(params));
    const anomalyParams = {
      listOfMonitorIds: [monitorId],
      dateStart: absoluteDateRangeStart,
      dateEnd: absoluteDateRangeEnd,
    };

    dispatch(getAnomalyRecordsAction.get(anomalyParams));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRangeStart, dateRangeEnd, dispatch, lastRefresh, monitorId]);

  return (
    <DurationChartComponent
      anomalies={anomalies}
      hasMLJob={hasMLJob}
      loading={loading}
      locationDurationLines={durationLines?.locationDurationLines ?? []}
    />
  );
};
