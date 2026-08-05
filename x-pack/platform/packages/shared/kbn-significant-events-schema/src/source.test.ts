/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveKnowledgeIndicatorSource } from './source';

describe('deriveKnowledgeIndicatorSource', () => {
  it('returns logs when there is no evidence', () => {
    expect(deriveKnowledgeIndicatorSource()).toEqual(['logs']);
    expect(deriveKnowledgeIndicatorSource([])).toEqual(['logs']);
  });

  it('returns code when all evidence is code-prefixed', () => {
    expect(deriveKnowledgeIndicatorSource(['code: acme/checkout pay.go error("boom")'])).toEqual([
      'code',
    ]);
  });

  it('returns logs when no evidence is code-prefixed', () => {
    expect(deriveKnowledgeIndicatorSource(['logs: observed pattern', 'sampled 42 docs'])).toEqual([
      'logs',
    ]);
  });

  it('returns both when evidence mixes code and non-code', () => {
    expect(
      deriveKnowledgeIndicatorSource(['code: acme/checkout pay.go', 'logs: observed pattern'])
    ).toEqual(['code', 'logs']);
  });
});
