/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import * as rt from 'io-ts';
import { useUrlState } from '../../../utils/use_url_state';

const autoRefreshRT = rt.union([
  rt.type({
    interval: rt.number,
    isPaused: rt.boolean,
  }),
  rt.undefined,
]);

export const stringTimeRangeRT = rt.type({
  startTime: rt.string,
  endTime: rt.string,
});
export type StringTimeRange = rt.TypeOf<typeof stringTimeRangeRT>;

const urlTimeRangeRT = rt.union([stringTimeRangeRT, rt.undefined]);

const TIME_RANGE_URL_STATE_KEY = 'timeRange';
const AUTOREFRESH_URL_STATE_KEY = 'autoRefresh';

export const useLogAnalysisResultsUrlState = () => {
  const [timeRange, setTimeRange] = useUrlState({
    defaultState: {
      startTime: 'now-2w',
      endTime: 'now',
    },
    decodeUrlState: (value: unknown) => urlTimeRangeRT.decode(value).getOrElse(undefined),
    encodeUrlState: urlTimeRangeRT.encode,
    urlStateKey: TIME_RANGE_URL_STATE_KEY,
  });

  useEffect(() => {
    setTimeRange(timeRange);
  }, []);

  const [autoRefresh, setAutoRefresh] = useUrlState({
    defaultState: {
      isPaused: false,
      interval: 30000,
    },
    decodeUrlState: (value: unknown) => autoRefreshRT.decode(value).getOrElse(undefined),
    encodeUrlState: autoRefreshRT.encode,
    urlStateKey: AUTOREFRESH_URL_STATE_KEY,
  });

  useEffect(() => {
    setAutoRefresh(autoRefresh);
  }, []);

  return {
    timeRange,
    setTimeRange,
    autoRefresh,
    setAutoRefresh,
  };
};
