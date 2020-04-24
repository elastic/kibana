/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PingHistogramComponent } from '../../common/charts';
import { getPingHistogram } from '../../../state/actions';
import { selectPingHistogram } from '../../../state/selectors';
import { useGetUrlParams } from '../../../hooks';
import { useMonitorId } from '../../../hooks';
import { ResponsiveWrapperProps, withResponsiveWrapper } from '../../common/higher_order';

interface Props {
  height: string;
}

const Container: React.FC<Props & ResponsiveWrapperProps> = ({ height }) => {
  const {
    statusFilter,
    absoluteDateRangeStart,
    absoluteDateRangeEnd,
    dateRangeStart: dateStart,
    dateRangeEnd: dateEnd,
  } = useGetUrlParams();

  const dispatch = useDispatch();
  const monitorId = useMonitorId();

  const { loading, data, esKuery, lastRefresh } = useSelector(selectPingHistogram);

  useEffect(() => {
    dispatch(getPingHistogram({ monitorId, dateStart, dateEnd, statusFilter, filters: esKuery }));
  }, [dateStart, dateEnd, monitorId, statusFilter, lastRefresh, esKuery, dispatch]);
  return (
    <PingHistogramComponent
      data={data}
      absoluteStartDate={absoluteDateRangeStart}
      absoluteEndDate={absoluteDateRangeEnd}
      height={height}
      loading={loading}
    />
  );
};

export const PingHistogram = withResponsiveWrapper(Container);
