/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedLogsSummary } from '../logs_extraction/logs_extraction_client';
import { NonPriorityExtractionDisabledError } from '../errors';
import type { RunEventInput } from './types';
import { SYSTEM_EVENT_ACTION, SYSTEM_EVENT_REASON } from './types';

export type ExtractionRunBase = Omit<RunEventInput, 'action' | 'outcome'>;

/**
 * Turns an extraction result, or the error it threw, into a run event. Returns undefined for an
 * idle tick (non-priority process switched off), which is not a run.
 */
export const toExtractionRunEvent = (
  base: ExtractionRunBase,
  result: { summary: ExtractedLogsSummary } | { error: unknown },
  signal?: AbortSignal
): RunEventInput | undefined => {
  const event = { ...base, action: SYSTEM_EVENT_ACTION.extraction };
  const failure = (error: unknown): RunEventInput => ({
    ...event,
    outcome: 'failure',
    ...(signal?.aborted ? { reason: SYSTEM_EVENT_REASON.aborted } : {}),
    error,
  });

  if ('error' in result) {
    return failure(result.error);
  }
  const { summary } = result;
  if (summary.success) {
    return {
      ...event,
      outcome: 'success',
      extraction: {
        count: summary.count,
        pages: summary.pages,
        logs_processed: summary.logsProcessed,
        logs_cap_applied: summary.logsCapApplied,
      },
    };
  }
  if (summary.error instanceof NonPriorityExtractionDisabledError) {
    return undefined;
  }
  return failure(summary.error);
};
