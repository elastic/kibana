/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { AppState } from '../../../state';
import {
  PingHistogramComponent,
  PingHistogramComponentProps,
} from '../../functional/charts/ping_histogram';
import { getPingHistogram } from '../../../state/actions';
import { selectPingHistogram } from '../../../state/selectors';
import { withResponsiveWrapper, ResponsiveWrapperProps } from '../../higher_order';
import { GetPingHistogramParams, HistogramResult } from '../../../../common/types';
import { useUrlParams } from '../../../hooks';

type Props = ResponsiveWrapperProps &
  Pick<PingHistogramComponentProps, 'height' | 'data' | 'loading'> &
  DispatchProps & { lastRefresh: number; monitorId?: string; esKuery?: string };

const PingHistogramContainer: React.FC<Props> = ({
  data,
  loadData,
  monitorId,
  lastRefresh,
  height,
  loading,
  esKuery,
}) => {
  const [getUrlParams] = useUrlParams();
  const {
    absoluteDateRangeStart,
    absoluteDateRangeEnd,
    dateRangeStart: dateStart,
    dateRangeEnd: dateEnd,
    statusFilter,
  } = getUrlParams();

  useEffect(() => {
    loadData({ monitorId, dateStart, dateEnd, statusFilter, filters: esKuery });
  }, [loadData, dateStart, dateEnd, monitorId, statusFilter, lastRefresh, esKuery]);
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

interface StateProps {
  data: HistogramResult | null;
  loading: boolean;
  lastRefresh: number;
  esKuery: string;
}

interface DispatchProps {
  loadData: typeof getPingHistogram;
}

const mapStateToProps = (state: AppState): StateProps => ({ ...selectPingHistogram(state) });

const mapDispatchToProps = (dispatch: any): DispatchProps => ({
  loadData: (params: GetPingHistogramParams) => {
    return dispatch(getPingHistogram(params));
  },
});

export const PingHistogram = connect<
  StateProps,
  DispatchProps,
  Pick<PingHistogramComponentProps, 'height'>,
  AppState
>(
  mapStateToProps,
  mapDispatchToProps
)(withResponsiveWrapper(PingHistogramContainer));
