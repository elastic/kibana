/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DurationInputObject } from 'moment';
import moment from 'moment';
import type { LogsLocatorParams } from './logs_locator';

export interface NodeLogsParams {
  nodeField: string;
  nodeId: string;
  filter?: string;
}

export const getNodeQuery = (params: NodeLogsParams): LogsLocatorParams['query'] => {
  const { nodeField, nodeId, filter } = params;

  const nodeFilter = `${nodeField}: ${nodeId}`;
  const query = filter ? `(${nodeFilter}) and (${filter})` : nodeFilter;

  return { language: 'kuery', query };
};

export interface TraceLogsParams {
  traceId: string;
  filter?: string;
}

export const getTraceQuery = (params: TraceLogsParams): LogsLocatorParams['query'] => {
  const { traceId, filter } = params;

  const traceFilter = `trace.id:"${traceId}" OR (not trace.id:* AND "${traceId}")`;
  const query = filter ? `(${traceFilter}) and (${filter})` : traceFilter;

  return { language: 'kuery', query };
};

const defaultTimeRangeFromPositionOffset: DurationInputObject = { hours: 1 };

export function getTimeRange(time: number | undefined): LogsLocatorParams['timeRange'] {
  if (time === undefined) {
    return undefined;
  }
  return {
    from: getTimeRangeStartFromTime(time),
    to: getTimeRangeEndFromTime(time),
  };
}

export const getTimeRangeStartFromTime = (time: number): string =>
  moment(time).subtract(defaultTimeRangeFromPositionOffset).toISOString();

export const getTimeRangeEndFromTime = (time: number): string =>
  moment(time).add(defaultTimeRangeFromPositionOffset).toISOString();
