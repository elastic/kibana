/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimefilterContract, TimefilterHook, RefreshInterval } from '@kbn/data-plugin/public';
import { useKibana } from './use_kibana';

export function useTimefilter(): TimefilterHook & {
  setTime: TimefilterContract['setTime'];
  readonly refreshInterval: RefreshInterval;
  setRefreshInterval: TimefilterContract['setRefreshInterval'];
} {
  const {
    dependencies: {
      start: {
        data: { query },
      },
    },
  } = useKibana();

  const result = query.timefilter.timefilter.useTimefilter();
  const refreshInterval = query.timefilter.timefilter.getRefreshInterval();

  return {
    ...result,
    setTime: query.timefilter.timefilter.setTime,
    refreshInterval,
    setRefreshInterval: query.timefilter.timefilter.setRefreshInterval,
  };
}
