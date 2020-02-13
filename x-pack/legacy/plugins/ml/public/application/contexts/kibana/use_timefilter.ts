/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

import { useMlKibana } from './kibana_context';

interface UseTimefilterOptions {
  timeRangeSelector?: boolean;
  autoRefreshSelector?: boolean;
}

export const useTimefilter = ({
  timeRangeSelector = true,
  autoRefreshSelector = true,
}: UseTimefilterOptions = {}) => {
  const { services } = useMlKibana();
  const { timefilter } = services.data.query.timefilter;

  useEffect(() => {
    if (timeRangeSelector) {
      timefilter.enableTimeRangeSelector();
    } else {
      timefilter.disableTimeRangeSelector();
    }

    if (autoRefreshSelector) {
      timefilter.enableAutoRefreshSelector();
    } else {
      timefilter.disableAutoRefreshSelector();
    }
  }, [timeRangeSelector, autoRefreshSelector]);

  return timefilter;
};
