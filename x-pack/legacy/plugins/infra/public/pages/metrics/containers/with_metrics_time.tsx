/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import React, { useContext, useState, useCallback } from 'react';
import { isNumber } from 'lodash';
import moment from 'moment';
import dateMath from '@elastic/datemath';
import * as rt from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { replaceStateKeyInQueryString, UrlStateContainer } from '../../../utils/url_state';
import { InfraTimerangeInput } from '../../../graphql/types';

export interface MetricsTimeInput {
  from: string;
  to: string;
  interval: string;
}

interface MetricsTimeState {
  timeRange: MetricsTimeInput;
  parsedTimeRange: InfraTimerangeInput;
  setTimeRange: (timeRange: MetricsTimeInput) => void;
  refreshInterval: number;
  setRefreshInterval: (refreshInterval: number) => void;
  isAutoReloading: boolean;
  setAutoReload: (isAutoReloading: boolean) => void;
  lastRefresh: number;
  triggerRefresh: () => void;
}

const parseRange = (range: MetricsTimeInput) => {
  const parsedFrom = dateMath.parse(range.from);
  const parsedTo = dateMath.parse(range.to, { roundUp: true });
  return {
    ...range,
    from:
      (parsedFrom && parsedFrom.valueOf()) ||
      moment()
        .subtract(1, 'hour')
        .valueOf(),
    to: (parsedTo && parsedTo.valueOf()) || moment().valueOf(),
  };
};

export const useMetricsTime = () => {
  const defaultRange = {
    from: 'now-1h',
    to: 'now',
    interval: '>=1m',
  };
  const [isAutoReloading, setAutoReload] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [lastRefresh, setLastRefresh] = useState<number>(moment().valueOf());
  const [timeRange, setTimeRange] = useState(defaultRange);

  const [parsedTimeRange, setParsedTimeRange] = useState(parseRange(defaultRange));

  const updateTimeRange = useCallback(
    (range: MetricsTimeInput) => {
      setTimeRange(range);
      setParsedTimeRange(parseRange(range));
    },
    [setParsedTimeRange]
  );

  return {
    timeRange,
    setTimeRange: updateTimeRange,
    parsedTimeRange,
    refreshInterval,
    setRefreshInterval,
    isAutoReloading,
    setAutoReload,
    lastRefresh,
    triggerRefresh: useCallback(() => setLastRefresh(moment().valueOf()), [setLastRefresh]),
  };
};

export const MetricsTimeContainer = createContainer(useMetricsTime);

interface WithMetricsTimeProps {
  children: (args: MetricsTimeState) => React.ReactElement;
}
export const WithMetricsTime: React.FunctionComponent<WithMetricsTimeProps> = ({
  children,
}: WithMetricsTimeProps) => {
  const metricsTimeState = useContext(MetricsTimeContainer.Context);
  return children({ ...metricsTimeState });
};

/**
 * Url State
 */

interface MetricsTimeUrlState {
  time?: MetricsTimeState['timeRange'];
  autoReload?: boolean;
  refreshInterval?: number;
}

export const WithMetricsTimeUrlState = () => (
  <WithMetricsTime>
    {({
      timeRange,
      setTimeRange,
      refreshInterval,
      setRefreshInterval,
      isAutoReloading,
      setAutoReload,
    }) => (
      <UrlStateContainer
        urlState={{
          time: timeRange,
          autoReload: isAutoReloading,
          refreshInterval,
        }}
        urlStateKey="metricTime"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.time) {
            setTimeRange(newUrlState.time);
          }
          if (newUrlState && newUrlState.autoReload) {
            setAutoReload(true);
          } else if (
            newUrlState &&
            typeof newUrlState.autoReload !== 'undefined' &&
            !newUrlState.autoReload
          ) {
            setAutoReload(false);
          }
          if (newUrlState && newUrlState.refreshInterval) {
            setRefreshInterval(newUrlState.refreshInterval);
          }
        }}
        onInitialize={initialUrlState => {
          if (initialUrlState && initialUrlState.time) {
            if (
              timeRange.from !== initialUrlState.time.from ||
              timeRange.to !== initialUrlState.time.to ||
              timeRange.interval !== initialUrlState.time.interval
            ) {
              setTimeRange(initialUrlState.time);
            }
          }
          if (initialUrlState && initialUrlState.autoReload) {
            setAutoReload(true);
          }
          if (initialUrlState && initialUrlState.refreshInterval) {
            setRefreshInterval(initialUrlState.refreshInterval);
          }
        }}
      />
    )}
  </WithMetricsTime>
);

const mapToUrlState = (value: any): MetricsTimeUrlState | undefined =>
  value
    ? {
        time: mapToTimeUrlState(value.time),
        autoReload: mapToAutoReloadUrlState(value.autoReload),
        refreshInterval: mapToRefreshInterval(value.refreshInterval),
      }
    : undefined;

const MetricsTimeRT = rt.type({
  from: rt.union([rt.string, rt.number]),
  to: rt.union([rt.string, rt.number]),
  interval: rt.string,
});

const mapToTimeUrlState = (value: any) => {
  const result = MetricsTimeRT.decode(value);
  if (isRight(result)) {
    const resultValue = result.right;
    const to = isNumber(resultValue.to) ? moment(resultValue.to).toISOString() : resultValue.to;
    const from = isNumber(resultValue.from)
      ? moment(resultValue.from).toISOString()
      : resultValue.from;
    return { ...resultValue, from, to };
  }
  return undefined;
};

const mapToAutoReloadUrlState = (value: any) => (typeof value === 'boolean' ? value : undefined);

const mapToRefreshInterval = (value: any) => (typeof value === 'number' ? value : undefined);

export const replaceMetricTimeInQueryString = (from: number, to: number) =>
  Number.isNaN(from) || Number.isNaN(to)
    ? (value: string) => value
    : replaceStateKeyInQueryString<MetricsTimeUrlState>('metricTime', {
        autoReload: false,
        time: {
          interval: '>=1m',
          from: moment(from).toISOString(),
          to: moment(to).toISOString(),
        },
      });
