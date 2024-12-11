/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamFactoryReturnType } from '@kbn/ml-response-stream/server';

import {
  ping,
  type AiopsLogRateAnalysisApiAction,
} from '@kbn/aiops-log-rate-analysis/api/stream_reducer';

import type { LogDebugMessage } from './log_debug_message';
import type { StateHandler } from './state_handler';

// 10s ping frequency to keep the stream alive.
const PING_FREQUENCY = 10000;

/**
 * Helper function that will push a ping message every 10s until the stream finishes.
 * This is implemented as a factory that receives the necessary dependencies
 * which then returns the actual helper function.
 */
export const streamPushPingWithTimeoutFactory = (
  stateHandler: StateHandler,
  push: StreamFactoryReturnType<AiopsLogRateAnalysisApiAction>['push'],
  logDebugMessage: LogDebugMessage
) => {
  return function pushPingWithTimeout() {
    setTimeout(() => {
      if (stateHandler.isRunning()) {
        logDebugMessage('Ping message.');
        push(ping());
        pushPingWithTimeout();
      }
    }, PING_FREQUENCY);
  };
};
