/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector, useDispatch } from 'react-redux';
import React, { useContext, useCallback } from 'react';
import { selectPingList } from '../../../state/selectors';
import { getPings } from '../../../state/actions';
import { GetPingsParams } from '../../../../common/types/ping/ping';
import { UptimeSettingsContext } from '../../../contexts';
import { PingListComponent } from '../../functional';

export interface PingListProps {
  monitorId: string;
  onSelectedStatusChange: (status: string | undefined) => void;
  onSelectedLocationChange: (location: any) => void;
  onPageCountChange: (itemCount: number) => void;
  pageSize: number;
  selectedOption: string;
  selectedLocation: string | undefined;
  size: number;
  status: string;
}
export const PingList = (props: PingListProps) => {
  const {
    loading,
    pingList: { locations, pings },
  } = useSelector(selectPingList);

  const { dateRangeStart: from, dateRangeEnd: to } = useContext(UptimeSettingsContext);

  const dispatch = useDispatch();
  const getPingsCallback = useCallback(
    ({ dateRangeStart, dateRangeEnd, location, monitorId, size, status }: GetPingsParams) =>
      dispatch(
        getPings({
          dateRangeStart,
          dateRangeEnd,
          location,
          monitorId,
          size,
          status,
        })
      ),
    [dispatch]
  );

  return (
    <PingListComponent
      dateRangeStart={from}
      dateRangeEnd={to}
      getPings={getPingsCallback}
      loading={loading}
      locations={locations}
      pings={pings}
      {...props}
    />
  );
};
