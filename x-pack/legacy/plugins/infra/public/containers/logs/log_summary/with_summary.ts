/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';

import { RendererFunction } from '../../../utils/typed_react';
import { Source } from '../../source';
import { LogViewConfiguration } from '../log_view_configuration';
import { LogSummaryBuckets, useLogSummary } from './log_summary';
import { LogFilterState } from '../log_filter';
import { LogPositionState } from '../log_position';

export const WithSummary = ({
  children,
}: {
  children: RendererFunction<{
    buckets: LogSummaryBuckets;
    start: number | null;
    end: number | null;
  }>;
}) => {
  const { intervalSize } = useContext(LogViewConfiguration.Context);
  const { sourceId } = useContext(Source.Context);
  const { filterQuery } = useContext(LogFilterState.Context);
  const [{ visibleMidpointTime }] = useContext(LogPositionState.Context);

  const { buckets, start, end } = useLogSummary(
    sourceId,
    visibleMidpointTime,
    intervalSize,
    filterQuery
  );

  return children({ buckets, start, end });
};
