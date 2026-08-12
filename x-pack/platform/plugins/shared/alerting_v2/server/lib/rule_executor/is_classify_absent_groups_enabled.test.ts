/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isClassifyAbsentGroupsEnabled } from './is_classify_absent_groups_enabled';
import { createRuleResponse } from '../test_utils';

describe('isClassifyAbsentGroupsEnabled', () => {
  it('returns false for signal rules even when a recovery strategy is set', () => {
    const rule = createRuleResponse({ kind: 'signal', recovery_strategy: 'no_breach' });
    expect(isClassifyAbsentGroupsEnabled(rule)).toBe(false);
  });

  it('returns true when a recovery strategy other than none is set', () => {
    expect(
      isClassifyAbsentGroupsEnabled(createRuleResponse({ recovery_strategy: 'no_breach' }))
    ).toBe(true);
    expect(isClassifyAbsentGroupsEnabled(createRuleResponse({ recovery_strategy: 'query' }))).toBe(
      true
    );
  });

  it('returns true when no-data is enabled even if recovery is none', () => {
    const rule = createRuleResponse({
      recovery_strategy: 'none',
      no_data_strategy: 'emit',
      query: {
        format: 'standalone',
        breach: { query: 'FROM logs-* | LIMIT 10' },
        no_data: { query: 'FROM logs-* | STATS c BY host.name' },
      },
    });
    expect(isClassifyAbsentGroupsEnabled(rule)).toBe(true);
  });

  it('returns false when recovery is none and no-data is not configured', () => {
    const rule = createRuleResponse({ recovery_strategy: 'none' });
    expect(isClassifyAbsentGroupsEnabled(rule)).toBe(false);
  });

  it("returns false when no_data_strategy is 'none' even if a no_data block exists", () => {
    const rule = createRuleResponse({
      recovery_strategy: 'none',
      no_data_strategy: 'none',
      query: {
        format: 'standalone',
        breach: { query: 'FROM logs-* | LIMIT 10' },
        no_data: { query: 'FROM logs-* | STATS c BY host.name' },
      },
    });
    expect(isClassifyAbsentGroupsEnabled(rule)).toBe(false);
  });
});
