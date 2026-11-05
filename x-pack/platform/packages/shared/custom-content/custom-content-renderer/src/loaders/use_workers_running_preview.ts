/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';
import {
  getWorkersRunningPreview,
  subscribeWorkersRunningPreview,
} from './workers_running_preview';

/** Whether the Alert Zero page is showing the workers-running state on demand. */
export const useWorkersRunningPreview = (): boolean =>
  useSyncExternalStore(
    subscribeWorkersRunningPreview,
    getWorkersRunningPreview,
    getWorkersRunningPreview
  );
