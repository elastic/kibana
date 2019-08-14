/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { useEffect } from 'react';
import * as rt from 'io-ts';
import { useUrlState } from '../../../utils/use_url_state';
import { timeRangeRT } from '../../../../common/http_api/shared/time_range';

const autoRefreshRT = rt.boolean;

const TIME_RANGE_URL_STATE_KEY = 'timeRange';
const AUTOREFRESH_URL_STATE_KEY = 'autoRefresh';

export const useLogAnalysisResultsUrlState = () => {
  const [timeRange, setTimeRange] = useUrlState({
    defaultState: {
      startTime: moment
        .utc()
        .subtract(2, 'weeks')
        .valueOf(),
      endTime: moment.utc().valueOf(),
    },
    decodeUrlState: (value: unknown) => timeRangeRT.decode(value).getOrElse(undefined),
    encodeUrlState: timeRangeRT.encode,
    urlStateKey: TIME_RANGE_URL_STATE_KEY,
  });

  useEffect(() => {
    setTimeRange(timeRange);
  }, []);

  const [autoRefreshEnabled, setAutoRefresh] = useUrlState({
    defaultState: false,
    decodeUrlState: (value: unknown) => autoRefreshRT.decode(value).getOrElse(undefined),
    encodeUrlState: autoRefreshRT.encode,
    urlStateKey: AUTOREFRESH_URL_STATE_KEY,
  });

  useEffect(() => {
    setAutoRefresh(autoRefreshEnabled);
  }, []);

  return {
    timeRange,
    setTimeRange,
    autoRefreshEnabled,
    setAutoRefresh,
  };
};
