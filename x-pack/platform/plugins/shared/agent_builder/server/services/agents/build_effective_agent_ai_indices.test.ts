/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEffectiveAgentAiIndices } from './build_effective_agent_ai_indices';

describe('buildEffectiveAgentAiIndices', () => {
  it('flags inherited ids as defaults and lists them first', () => {
    expect(
      buildEffectiveAgentAiIndices({
        inherited: ['elastic'],
        assigned: ['sales'],
      })
    ).toEqual([
      { id: 'elastic', is_default: true },
      { id: 'sales', is_default: false },
    ]);
  });

  it('deduplicates ids present in both layers, keeping the default flag', () => {
    expect(
      buildEffectiveAgentAiIndices({
        inherited: ['elastic'],
        assigned: ['elastic', 'sales'],
      })
    ).toEqual([
      { id: 'elastic', is_default: true },
      { id: 'sales', is_default: false },
    ]);
  });
});
