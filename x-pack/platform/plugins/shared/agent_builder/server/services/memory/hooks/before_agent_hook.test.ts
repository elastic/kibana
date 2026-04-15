/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMemoryInjection, injectMemoryIntoMessage } from './before_agent_hook';
import type { ScoredMemoryNode } from '../retrieval/scoring';
import type { MemoryNode } from '@kbn/agent-builder-common';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeNode = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
  id: 'test-id-abc123',
  type: 'semantic',
  summary: 'User prefers TypeScript over JavaScript.',
  full: 'User has repeatedly expressed TypeScript preference.',
  confidence: 0.9,
  salience: 0.7,
  recency: new Date().toISOString(),
  utility: 0.8,
  stability: 0.5,
  access_count: 5,
  reinforcement_score: 0.6,
  status: 'established',
  source_refs: [],
  links: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  space: 'default',
  user_name: 'testuser',
  ...overrides,
});

const makeScoredNode = (nodeOverrides: Partial<MemoryNode> = {}): ScoredMemoryNode => ({
  node: makeNode(nodeOverrides),
  score: 1.5,
  relevanceScore: 0.8,
  graphProximityBonus: 0,
});

// ---------------------------------------------------------------------------
// formatMemoryInjection
// ---------------------------------------------------------------------------

describe('formatMemoryInjection', () => {
  it('returns empty string for empty input', () => {
    expect(formatMemoryInjection([])).toBe('');
  });

  it('includes ## Active Memories header', () => {
    const result = formatMemoryInjection([makeScoredNode()]);
    expect(result).toContain('## Active Memories');
  });

  it('formats memory with id prefix (first 7 chars), type, summary, and confidence', () => {
    const result = formatMemoryInjection([
      makeScoredNode({
        id: 'abcdef1234567',
        type: 'semantic',
        summary: 'User prefers TypeScript.',
        confidence: 0.9,
      }),
    ]);
    expect(result).toContain('[abcdef1]');
    expect(result).toContain('(semantic)');
    expect(result).toContain('User prefers TypeScript.');
    expect(result).toContain('[confidence: 0.9]');
  });

  it('formats procedural memory type correctly', () => {
    const result = formatMemoryInjection([
      makeScoredNode({ type: 'procedural', summary: 'Always run tests before committing.' }),
    ]);
    expect(result).toContain('(procedural)');
    expect(result).toContain('Always run tests before committing.');
  });

  it('formats episodic memory type correctly', () => {
    const result = formatMemoryInjection([
      makeScoredNode({
        type: 'episodic',
        summary: 'Last deployment failed due to missing config.',
      }),
    ]);
    expect(result).toContain('(episodic)');
    expect(result).toContain('Last deployment failed due to missing config.');
  });

  it('includes all memories in output', () => {
    const nodes = [
      makeScoredNode({ id: 'mem1', summary: 'First fact.' }),
      makeScoredNode({ id: 'mem2', summary: 'Second fact.' }),
      makeScoredNode({ id: 'mem3', summary: 'Third fact.' }),
    ];
    const result = formatMemoryInjection(nodes);
    expect(result).toContain('First fact.');
    expect(result).toContain('Second fact.');
    expect(result).toContain('Third fact.');
  });

  it('uses first 7 characters of the id', () => {
    const result = formatMemoryInjection([makeScoredNode({ id: 'very-long-id-1234567890' })]);
    expect(result).toContain('[very-lo]');
  });

  it('formats confidence with one decimal place', () => {
    const result = formatMemoryInjection([makeScoredNode({ confidence: 0.75 })]);
    expect(result).toContain('[confidence: 0.8]');
  });

  it('confidence 1.0 formats as 1.0', () => {
    const result = formatMemoryInjection([makeScoredNode({ confidence: 1.0 })]);
    expect(result).toContain('[confidence: 1.0]');
  });

  it('confidence 0.0 formats as 0.0', () => {
    const result = formatMemoryInjection([makeScoredNode({ confidence: 0.0 })]);
    expect(result).toContain('[confidence: 0.0]');
  });
});

// ---------------------------------------------------------------------------
// injectMemoryIntoMessage
// ---------------------------------------------------------------------------

describe('injectMemoryIntoMessage', () => {
  it('returns original message when memoryBundle is empty string', () => {
    const message = 'What is the weather today?';
    expect(injectMemoryIntoMessage(message, '')).toBe(message);
  });

  it('prepends [Memory Context] header when bundle is provided', () => {
    const message = 'Help me write TypeScript code.';
    const bundle =
      '## Active Memories\n[abc1234] (semantic) User prefers TypeScript. [confidence: 0.9]';
    const result = injectMemoryIntoMessage(message, bundle);
    expect(result).toContain('[Memory Context]');
    expect(result).toContain('## Active Memories');
    expect(result).toContain('Help me write TypeScript code.');
  });

  it('places memory context before the user message', () => {
    const message = 'User query here.';
    const bundle = '## Active Memories\n[mem] (semantic) A memory.';
    const result = injectMemoryIntoMessage(message, bundle);

    const memoryIdx = result.indexOf('[Memory Context]');
    const messageIdx = result.indexOf('User query here.');
    expect(memoryIdx).toBeLessThan(messageIdx);
  });

  it('preserves original message content exactly', () => {
    const message = 'Complex message with\nnewlines and special chars: <>&"\'';
    const bundle = '## Active Memories\n[mem] (semantic) Some memory.';
    const result = injectMemoryIntoMessage(message, bundle);
    expect(result).toContain(message);
  });

  it('separates memory block from user message with double newline', () => {
    const message = 'What is 2+2?';
    const bundle = '## Active Memories\n[mem] (semantic) A fact.';
    const result = injectMemoryIntoMessage(message, bundle);
    // The message should be separated by a blank line
    expect(result).toMatch(/\n\nWhat is 2\+2\?/);
  });

  it('handles empty message with bundle', () => {
    const result = injectMemoryIntoMessage('', '## Active Memories\n[mem] (semantic) A fact.');
    expect(result).toContain('[Memory Context]');
  });
});
