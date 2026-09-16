/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildScopeFormula } from './policy_scope_summary';

describe('buildScopeFormula', () => {
  it('describes the default space-wide scope', () => {
    expect(buildScopeFormula([], null)).toBe('all alerts v2 in this space');
  });

  it('describes selected tags without listing tag names', () => {
    expect(buildScopeFormula(['prod', 'staging'], null)).toBe(
      'all rules with one or multiple of the selected tags'
    );
  });

  it('describes expression conditions without repeating the KQL', () => {
    expect(buildScopeFormula([], 'episode_status : "active"')).toBe(
      'all episodes that meet the expression conditions'
    );
  });

  it('combines tags and expression conditions', () => {
    expect(buildScopeFormula(['prod'], 'episode_status : "active"')).toBe(
      'all rules with one or multiple of the selected tags and the expression conditions'
    );
  });
});
