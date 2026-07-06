/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import pRetry from 'p-retry';
import type { TraceAccessor } from './types';
import { extractChatEvidence } from './chat_evidence';

export const awaitTraceReady = async (traceAccessor: TraceAccessor, log: Logger): Promise<void> => {
  await pRetry(
    async () => {
      const evidence = await extractChatEvidence(traceAccessor);
      if (!evidence.agent_response.trim()) {
        throw new Error(
          `Trace ${traceAccessor.traceId} is not ready: agent response not yet available`
        );
      }
    },
    {
      retries: 2,
      factor: 2,
      minTimeout: 2000,
      maxTimeout: 10000,
      onFailedAttempt: (error) => {
        log.warn(
          `Trace ${traceAccessor.traceId} not ready on attempt ${error.attemptNumber}; retrying`
        );
      },
    }
  );
};
