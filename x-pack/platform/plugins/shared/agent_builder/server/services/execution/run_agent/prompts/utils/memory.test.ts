/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ShortTermMemory } from '@kbn/agent-builder-common';
import { getMemoryInstructions } from './memory';

const memory: ShortTermMemory = {
  id: 'memory-1',
  type: 'memory.session_fact',
  title: 'Prefers ES|QL',
  description: 'The user wants ES|QL examples instead of DSL.',
  content: 'Always answer with ES|QL.\nNever DSL.',
  tags: [],
  user_id: 'u_alice_0',
  user_name: 'alice',
  agent_id: 'agent-1',
  session_id: 'conversation-1',
  space: 'default',
  created_at: '2026-10-26T12:00:00.000Z',
  updated_at: '2026-10-26T12:00:00.000Z',
  promotion: { status: 'pending' },
};

describe('getMemoryInstructions', () => {
  it('is empty when memory is off', () => {
    expect(getMemoryInstructions({ enabled: false, memories: [memory] })).toBe('');
  });

  it('lists recent memories with their ids and the memory tools', () => {
    const prompt = getMemoryInstructions({ enabled: true, memories: [memory] });

    expect(prompt).toContain('## MEMORY');
    expect(prompt).toContain('[memory-1]');
    expect(prompt).toContain('**Prefers ES|QL**');
    expect(prompt).toContain('Always answer with ES|QL. Never DSL.');
    expect(prompt).toContain('platform.context_engine.remember');
    expect(prompt).toContain('platform.context_engine.recall');
    expect(prompt).toContain('platform.context_engine.forget');
    expect(prompt).not.toContain('u_alice_0');
  });

  it('says so when there are no memories yet', () => {
    expect(getMemoryInstructions({ enabled: true, memories: [] })).toContain(
      'There are no memories with this user yet.'
    );
  });

  it('truncates long memory content', () => {
    const prompt = getMemoryInstructions({
      enabled: true,
      memories: [{ ...memory, content: 'x'.repeat(2000) }],
    });

    expect(prompt).toContain(`${'x'.repeat(500)}…`);
    expect(prompt).not.toContain('x'.repeat(501));
  });
});
