/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { connect } from 'react-redux';

import { logFilterSelectors, logPositionSelectors, State } from '../../../store';
import { RendererFunction } from '../../../utils/typed_react';
import { Source } from '../../source';
import { LogViewConfiguration } from '../log_view_configuration';
import { LogSummaryBuckets, useLogSummary } from './log_summary';

export const WithSummary = connect((state: State) => ({
  visibleMidpointTime: logPositionSelectors.selectVisibleMidpointOrTargetTime(state),
  filterQuery: logFilterSelectors.selectLogFilterQueryAsJson(state),
}))(
  ({
    children,
    filterQuery,
    visibleMidpointTime,
  }: {
    children: RendererFunction<{ buckets: LogSummaryBuckets }>;
    filterQuery: string | null;
    visibleMidpointTime: number | null;
  }) => {
    const { intervalSize } = useContext(LogViewConfiguration.Context);
    const { sourceId } = useContext(Source.Context);

    const { buckets } = useLogSummary(sourceId, visibleMidpointTime, intervalSize, filterQuery);

    return children({ buckets });
  }
);
