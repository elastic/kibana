/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { threadId } from 'worker_threads';
import { runOffender } from './offenders';
import type { IsolatedTaskRequest, IsolatedTaskResult } from './isolated_task_protocol';

/** Executes an allowlisted module inside a research pool; no live plugin contracts cross. */
export const executeIsolatedTask = async (
  request: IsolatedTaskRequest
): Promise<IsolatedTaskResult> => {
  if (request.module === 'field_caps') {
    const { shapeFieldCapsBytes } = await import('../tier_b/field_caps_shape');
    const result = await shapeFieldCapsBytes(request.bytes, request.pattern);
    return { module: 'field_caps', result, threadId, heapUsed: process.memoryUsage().heapUsed };
  }
  if (request.module !== 'offender') throw new Error('Unknown research task module');
  if (request.params.kind === 'infinite_loop') {
    // No safety cap in the discardable isolate: only independent supervision can stop this.
    for (;;) {
      performance.now();
    }
  }
  const result = await runOffender(request.params);
  return { module: 'offender', result, threadId, heapUsed: process.memoryUsage().heapUsed };
};
