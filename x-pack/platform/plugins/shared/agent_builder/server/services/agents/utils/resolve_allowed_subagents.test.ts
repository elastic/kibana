/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SELF_AGENT_ID } from '@kbn/agent-builder-common';
import { resolveAllowedSubagents } from './resolve_allowed_subagents';

type MockValue = { description?: string } | 'deny' | 'missing';

const makeRegistry = (map: Record<string, MockValue>) => ({
  get: jest.fn(async (id: string) => {
    const v = map[id];
    if (v === undefined || v === 'missing') throw new Error('not found');
    if (v === 'deny') throw new Error('forbidden');
    return v;
  }),
});

describe('resolveAllowedSubagents', () => {
  it('returns [] on empty input without touching the registry', async () => {
    const registry = makeRegistry({});
    const out = await resolveAllowedSubagents({
      configuredIds: [],
      agentRegistry: registry,
    });
    expect(out).toEqual([]);
    expect(registry.get).not.toHaveBeenCalled();
  });

  it('returns _self with the fixed description and skips registry lookup for it', async () => {
    const registry = makeRegistry({});
    const out = await resolveAllowedSubagents({
      configuredIds: [SELF_AGENT_ID],
      agentRegistry: registry,
    });
    expect(out).toEqual([{ id: SELF_AGENT_ID, description: 'This agent (self-fork).' }]);
    expect(registry.get).not.toHaveBeenCalled();
  });

  it('resolves real ids, preserving persisted order', async () => {
    const registry = makeRegistry({
      a: { description: 'Alpha' },
      b: { description: 'Beta' },
    });
    const out = await resolveAllowedSubagents({
      configuredIds: ['a', 'b'],
      agentRegistry: registry,
    });
    expect(out.map((r) => r.id)).toEqual(['a', 'b']);
    expect(out.find((r) => r.id === 'a')?.description).toBe('Alpha');
  });

  it('interleaves _self with real ids at the persisted position', async () => {
    const registry = makeRegistry({ a: { description: 'Alpha' } });
    const out = await resolveAllowedSubagents({
      configuredIds: ['a', SELF_AGENT_ID],
      agentRegistry: registry,
    });
    expect(out.map((r) => r.id)).toEqual(['a', SELF_AGENT_ID]);
  });

  it('silently drops missing ids', async () => {
    const registry = makeRegistry({
      a: { description: 'Alpha' },
      ghost: 'missing',
    });
    const out = await resolveAllowedSubagents({
      configuredIds: ['a', 'ghost'],
      agentRegistry: registry,
    });
    expect(out.map((r) => r.id)).toEqual(['a']);
  });

  it('silently drops access-denied ids', async () => {
    const registry = makeRegistry({
      a: { description: 'Alpha' },
      hidden: 'deny',
    });
    const out = await resolveAllowedSubagents({
      configuredIds: ['a', 'hidden'],
      agentRegistry: registry,
    });
    expect(out.map((r) => r.id)).toEqual(['a']);
  });

  it('returns [] when every real id is inaccessible', async () => {
    const registry = makeRegistry({ a: 'deny', b: 'missing' });
    const out = await resolveAllowedSubagents({
      configuredIds: ['a', 'b'],
      agentRegistry: registry,
    });
    expect(out).toEqual([]);
  });

  it('dedupes duplicates in input (belt-and-suspenders)', async () => {
    const registry = makeRegistry({ a: { description: 'Alpha' } });
    const out = await resolveAllowedSubagents({
      configuredIds: ['a', 'a'],
      agentRegistry: registry,
    });
    expect(out.map((r) => r.id)).toEqual(['a']);
    // The dedupe happens before the parallel fetch, so we only call .get once.
    expect(registry.get).toHaveBeenCalledTimes(1);
  });

  it('falls back to "(no description)" when the target has no description', async () => {
    const registry = makeRegistry({ a: {} });
    const out = await resolveAllowedSubagents({
      configuredIds: ['a'],
      agentRegistry: registry,
    });
    expect(out[0].description).toBe('(no description)');
  });

  it('dedupes _self as well', async () => {
    const registry = makeRegistry({});
    const out = await resolveAllowedSubagents({
      configuredIds: [SELF_AGENT_ID, SELF_AGENT_ID],
      agentRegistry: registry,
    });
    expect(out.map((r) => r.id)).toEqual([SELF_AGENT_ID]);
  });
});
