/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildRunQuotaSettingsUpdate,
  createRunQuotaDraftState,
  isValidRunLimitDraft,
  parseRunLimitDraft,
} from './run_limit_draft';

const response = {
  enabled: false,
  limits: {
    detection: 100,
    investigation: 30,
    ki_extraction: 20,
  },
};

describe('run quota drafts', () => {
  it('treats zero as a valid unlimited value and rejects invalid limits', () => {
    expect(parseRunLimitDraft('0')).toBe(0);
    expect(isValidRunLimitDraft(0)).toBe(true);
    expect(isValidRunLimitDraft(10_000)).toBe(true);
    expect(isValidRunLimitDraft('')).toBe(false);
    expect(isValidRunLimitDraft(1.5)).toBe(false);
    expect(isValidRunLimitDraft(-1)).toBe(false);
    expect(isValidRunLimitDraft(10_001)).toBe(false);
  });

  it('builds a partial update with only settings changed by the user', () => {
    const state = createRunQuotaDraftState(response);
    state.draft.enabled = true;
    state.draft.limits.investigation = 0;

    expect(buildRunQuotaSettingsUpdate(state)).toEqual({
      enabled: true,
      limits: { investigation: 0 },
    });
  });

  it('does not build an update for unchanged or invalid drafts', () => {
    expect(buildRunQuotaSettingsUpdate(createRunQuotaDraftState(response))).toBeUndefined();

    const state = createRunQuotaDraftState(response);
    state.draft.limits.detection = '';
    expect(buildRunQuotaSettingsUpdate(state)).toBeUndefined();
  });
});
