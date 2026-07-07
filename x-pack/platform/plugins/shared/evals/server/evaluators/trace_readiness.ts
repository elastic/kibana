/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import pRetry from 'p-retry';
import type { TraceAccessor } from './types';
import { extractTraceEvidence } from './trace_evidence';

export const awaitTraceReady = async (traceAccessor: TraceAccessor, log: Logger): Promise<void> => {
  // `extractTraceEvidence` returns the terminal assistant turn for conversations
  // (tool-call turns are excluded) or the tool output for bare tool executions,
  // and that evidence is exported to logs/traces a few seconds after the
  // intermediate spans. Retry generously so grading waits for the final evidence
  // to land instead of racing ahead of its export and grading nothing.
  await pRetry(
    async () => {
      const evidence = await extractTraceEvidence(traceAccessor);
      if (!evidence.agent_response.trim()) {
        throw new Error(
          `Trace ${traceAccessor.traceId} is not ready: agent response not yet available`
        );
      }
    },
    {
      retries: 4,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 8000,
      onFailedAttempt: (error) => {
        log.warn(
          `Trace ${traceAccessor.traceId} not ready on attempt ${error.attemptNumber}; retrying`
        );
      },
    }
  );
};
