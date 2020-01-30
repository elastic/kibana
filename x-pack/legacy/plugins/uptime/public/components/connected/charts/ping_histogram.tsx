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

type Props = GetPingHistogramParams &
  ResponsiveWrapperProps &
  PingHistogramComponentProps &
  DispatchProps & { lastRefresh: number };

const PingHistogramContainer: React.FC<Props> = ({
  data,
  loadData,
  statusFilter,
  filters,
  dateStart,
  dateEnd,
  absoluteStartDate,
  absoluteEndDate,
  monitorId,
  lastRefresh,
  ...props
}) => {
  useEffect(() => {
    loadData({ monitorId, dateStart, dateEnd, statusFilter, filters });
  }, [loadData, dateStart, dateEnd, monitorId, filters, statusFilter, lastRefresh]);
  return (
    <PingHistogramComponent
      data={data}
      absoluteStartDate={absoluteStartDate}
      absoluteEndDate={absoluteEndDate}
      {...props}
    />
  );
};

interface StateProps {
  data: HistogramResult | null;
  loading: boolean;
  lastRefresh: number;
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
  PingHistogramComponentProps,
  AppState
>(
  mapStateToProps,
  mapDispatchToProps
)(withResponsiveWrapper(PingHistogramContainer));
