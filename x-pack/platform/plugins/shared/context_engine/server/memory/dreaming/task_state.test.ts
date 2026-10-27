/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stateSchemaByVersion } from './task_state';

describe('memory dreaming task state', () => {
  const { up, schema } = stateSchemaByVersion[3];

  it('moves the single window position to the fact cursor', () => {
    expect(up({ lastDreamAt: '2026-10-01T00:00:00.000Z', lastRunStatus: 'success' })).toEqual({
      lastDreamAt: '2026-10-01T00:00:00.000Z',
      lastRunStatus: 'success',
      cursors: { 'memory.fact': '2026-10-01T00:00:00.000Z' },
    });
  });

  it('leaves a state without a window position, or with cursors, unchanged', () => {
    const withCursors = { lastDreamAt: 'x', cursors: { 'memory.fact': 'y' } };

    expect(up({ lastRunStatus: 'failed' })).toEqual({ lastRunStatus: 'failed' });
    expect(up(withCursors)).toBe(withCursors);
  });

  it('accepts a partial run with per-type results', () => {
    expect(() =>
      schema.validate({
        lastRunStatus: 'partial',
        cursors: { 'memory.fact': '2026-10-01T00:00:00.000Z' },
        lastRunTypes: {
          'memory.fact': { memoriesRead: 3, applied: 1, skipped: 0, batches: 1, error: 'x' },
        },
        catchingUp: true,
        pendingMemories: 12,
      })
    ).not.toThrow();
  });
});
