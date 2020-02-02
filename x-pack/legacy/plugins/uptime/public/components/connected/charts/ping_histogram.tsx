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

type Props = GetPingHistogramParams &
  ResponsiveWrapperProps &
  PingHistogramComponentProps &
  PropsFromRedux;

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

const mapStateToProps = (state: AppState) => ({ ...selectPingHistogram(state) });

const mapDispatchToProps = {
  loadData: getPingHistogram,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const PingHistogram = connector(withResponsiveWrapper(PingHistogramContainer));
