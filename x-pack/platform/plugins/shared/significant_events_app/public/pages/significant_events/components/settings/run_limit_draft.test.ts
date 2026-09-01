/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createRunLimitDraftState,
  editRunLimitDraft,
  mergeRunLimitRefresh,
  toDraft,
  toDraftFromInput,
  toRunLimit,
} from './run_limit_draft';

const limits = {
  detection: { enabled: true, max: 100 } as const,
  investigation: { enabled: true, max: 30 } as const,
  ki_extraction: { enabled: false, max: 0 } as const,
};

describe('run limit drafts', () => {
  it('round trips every canonical limit shape', () => {
    for (const limit of Object.values(limits)) {
      expect(toRunLimit(toDraft(limit))).toEqual(limit);
    }
  });

  it('models zero as unlimited and an empty value as an invalid mid-edit state', () => {
    expect(toDraftFromInput('0')).toEqual({ enabled: false, max: 0 });
    expect(toRunLimit(toDraftFromInput('0'))).toEqual({ enabled: false, max: 0 });
    expect(toDraftFromInput('')).toEqual({ enabled: true, max: '' });
    expect(toRunLimit(toDraftFromInput(''))).toBeUndefined();
  });

  it('preserves dirty groups during refresh and updates untouched groups', () => {
    const dirty = editRunLimitDraft(
      createRunLimitDraftState(limits),
      'detection',
      toDraftFromInput('80')
    );

    const refreshed = mergeRunLimitRefresh(dirty, {
      detection: { enabled: true, max: 100 },
      investigation: { enabled: true, max: 40 },
      ki_extraction: { enabled: true, max: 20 },
    });

    expect(refreshed.drafts.detection).toEqual({ enabled: true, max: 80 });
    expect(refreshed.drafts.investigation).toEqual({ enabled: true, max: 40 });
    expect(refreshed.drafts.ki_extraction).toEqual({ enabled: true, max: 20 });
    expect(refreshed.conflictingGroups).toEqual([]);
  });

  it('surfaces a server conflict without wiping the local edit', () => {
    const dirty = editRunLimitDraft(
      createRunLimitDraftState(limits),
      'detection',
      toDraftFromInput('80')
    );

    const refreshed = mergeRunLimitRefresh(dirty, {
      ...limits,
      detection: { enabled: true, max: 90 },
    });

    expect(refreshed.drafts.detection).toEqual({ enabled: true, max: 80 });
    expect(refreshed.conflictingGroups).toEqual(['detection']);
  });
});
