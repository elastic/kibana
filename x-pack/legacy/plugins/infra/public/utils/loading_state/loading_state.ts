/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LoadingPolicy } from './loading_policy';
import { LoadingProgress } from './loading_progress';
import { LoadingResult } from './loading_result';

export interface LoadingState<Parameters> {
  current: LoadingProgress<Parameters>;
  last: LoadingResult<Parameters>;
  policy: LoadingPolicy;
}

export const initialLoadingState: LoadingState<any> = {
  current: {
    progress: 'idle',
  },
  last: {
    result: 'uninitialized',
  },
  policy: {
    policy: 'manual',
  },
};
