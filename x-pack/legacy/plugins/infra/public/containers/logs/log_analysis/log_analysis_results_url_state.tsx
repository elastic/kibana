/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { useEffect } from 'react';
import { useUrlState } from '../../../utils/use_url_state';
import { timeRangeRT } from '../../../../common/http_api/shared/time_range';

const TIME_RANGE_URL_STATE_KEY = 'timeRange';

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

  return {
    timeRange,
    setTimeRange,
  };
};
