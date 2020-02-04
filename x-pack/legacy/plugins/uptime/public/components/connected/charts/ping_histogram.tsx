/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { AppState } from '../../../state';
import {
  PingHistogramComponent,
  PingHistogramComponentProps,
} from '../../functional/charts/ping_histogram';
import { getPingHistogram } from '../../../state/actions';
import { selectPingHistogram } from '../../../state/selectors';
import { withResponsiveWrapper, ResponsiveWrapperProps } from '../../higher_order';
import { GetPingHistogramParams } from '../../../../common/types';
import { useUrlParams } from '../../../hooks';

type Props = ResponsiveWrapperProps &
  Pick<PingHistogramComponentProps, 'height' | 'data' | 'loading'> &
  PropsFromRedux;

const PingHistogramContainer: React.FC<Props> = ({
  data,
  loadData,
  monitorId,
  lastRefresh,
  height,
  loading,
}) => {
  const [getUrlParams] = useUrlParams();
  const {
    absoluteDateRangeStart,
    absoluteDateRangeEnd,
    dateRangeStart: dateStart,
    dateRangeEnd: dateEnd,
    statusFilter,
    filters,
  } = getUrlParams();

  useEffect(() => {
    loadData({ monitorId, dateStart, dateEnd, statusFilter, filters });
  }, [loadData, dateStart, dateEnd, monitorId, filters, statusFilter, lastRefresh]);
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

const mapStateToProps = (state: AppState) => ({ ...selectPingHistogram(state) });

const mapDispatchToProps = (dispatch: any) => ({
  loadData: (params: GetPingHistogramParams) => {
    return dispatch(getPingHistogram(params));
  },
});

const connector = connect<
  StateProps,
  DispatchProps,
  Pick<PingHistogramComponentProps, 'height'>,
  AppState
>(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const PingHistogram = connector(withResponsiveWrapper(PingHistogramContainer));
