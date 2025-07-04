/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimefilterContract, TimefilterHook } from '@kbn/data-plugin/public';
import { useKibana } from './use_kibana';

export function useTimefilter(): TimefilterHook & { setTime: TimefilterContract['setTime'] } {
  const {
    dependencies: {
      start: {
        data: { query },
      },
    },
  } = useKibana();

  const result = query.timefilter.timefilter.useTimefilter();

  return {
    ...result,
    setTime: query.timefilter.timefilter.setTime,
  };
}
