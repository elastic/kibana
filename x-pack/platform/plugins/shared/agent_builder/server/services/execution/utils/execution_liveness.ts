/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/agent-builder-common';
import type { ExecutionPeek } from '../persistence/agent_execution_client';
import {
  FOLLOW_EXECUTION_HEARTBEAT_TIMEOUT_MS,
  FOLLOW_EXECUTION_SCHEDULED_TIMEOUT_MS,
} from '../constants';

/**
 * Whether the run behind an execution record is still alive: running with a recent heartbeat,
 * or scheduled and not yet older than the scheduled grace period.
 */
export const isExecutionLive = (
  execution: Pick<ExecutionPeek, 'status' | 'lastHeartbeat'> | undefined,
  now: number = Date.now()
): boolean => {
  if (!execution?.lastHeartbeat) {
    return false;
  }

  const { status, lastHeartbeat } = execution;
  const timeoutMs =
    status === ExecutionStatus.running
      ? FOLLOW_EXECUTION_HEARTBEAT_TIMEOUT_MS
      : status === ExecutionStatus.scheduled
      ? FOLLOW_EXECUTION_SCHEDULED_TIMEOUT_MS
      : undefined;
  if (timeoutMs === undefined) {
    return false;
  }

  return now - Date.parse(lastHeartbeat) <= timeoutMs;
};
