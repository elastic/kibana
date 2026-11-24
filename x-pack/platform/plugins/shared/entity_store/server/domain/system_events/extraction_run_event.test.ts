/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractedLogsSummary } from '../logs_extraction/logs_extraction_client';
import { NonPriorityExtractionDisabledError } from '../errors';
import { toExtractionRunEvent } from './extraction_run_event';

const base = { startedAt: 0, trigger: 'task', entityType: 'host', mode: 'single' } as const;

const success: ExtractedLogsSummary = {
  success: true,
  isRemote: false,
  count: 3,
  pages: 1,
  scannedIndices: ['logs-*'],
  lastSearchTimestamp: '2026-11-17T00:00:00.000Z',
  logsCapApplied: false,
  logsProcessed: 120,
};

describe('toExtractionRunEvent', () => {
  it('records a success with extraction counts and no scanned indices', () => {
    expect(toExtractionRunEvent(base, { summary: success })).toEqual({
      ...base,
      action: 'extraction',
      outcome: 'success',
      extraction: { count: 3, pages: 1, logs_processed: 120, logs_cap_applied: false },
    });
  });

  it('records a failed summary', () => {
    const error = new Error('boom');
    expect(
      toExtractionRunEvent(base, { summary: { success: false, isRemote: false, error } })
    ).toMatchObject({ outcome: 'failure', error });
  });

  it('records a thrown error as aborted when the signal was aborted', () => {
    const controller = new AbortController();
    controller.abort();

    expect(
      toExtractionRunEvent(base, { error: new Error('timeout') }, controller.signal)
    ).toMatchObject({ outcome: 'failure', reason: 'aborted' });
  });

  it('skips an idle non-priority tick', () => {
    expect(
      toExtractionRunEvent(base, {
        summary: {
          success: false,
          isRemote: false,
          error: new NonPriorityExtractionDisabledError(),
        },
      })
    ).toBeUndefined();
  });
});
