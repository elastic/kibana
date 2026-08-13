/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAiIndicesInstructions } from './ai_indices';

describe('getAiIndicesInstructions', () => {
  it('renders nothing for an agent with no AI indices', () => {
    expect(getAiIndicesInstructions({ aiIndices: [], spaceId: 'default' })).toBe('');
  });

  it('names the space the conversation runs in', () => {
    const instructions = getAiIndicesInstructions({
      aiIndices: ['elastic'],
      spaceId: 'marketing',
    });

    expect(instructions).toContain('## AI INDICES');
    expect(instructions).toContain('`marketing`');
  });

  it('renders a filter that also matches indices without a spaces field', () => {
    const instructions = getAiIndicesInstructions({
      aiIndices: ['elastic'],
      spaceId: 'marketing',
    });
    const filter = JSON.parse(instructions.match(/```json\n(.+)\n```/)![1]);

    expect(filter).toEqual({
      bool: {
        should: [
          { term: { spaces: 'marketing' } },
          { term: { spaces: '*' } },
          { bool: { must_not: { exists: { field: 'spaces' } } } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('does not leak the Context Engine ids of the declared indices', () => {
    const instructions = getAiIndicesInstructions({
      aiIndices: ['elastic', 'some-private-id'],
      spaceId: 'default',
    });

    expect(instructions).not.toContain('some-private-id');
  });
});
