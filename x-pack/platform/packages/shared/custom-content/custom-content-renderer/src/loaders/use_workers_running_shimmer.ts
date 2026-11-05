/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';
import {
  getWorkersRunningShimmer,
  subscribeWorkersRunningShimmer,
} from './workers_running_shimmer';

/** Whether the workers-running title plays a shimmer. */
export const useWorkersRunningShimmer = (): boolean =>
  useSyncExternalStore(
    subscribeWorkersRunningShimmer,
    getWorkersRunningShimmer,
    getWorkersRunningShimmer
  );
