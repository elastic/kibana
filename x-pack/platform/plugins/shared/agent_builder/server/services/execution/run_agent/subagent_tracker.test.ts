/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SELF_AGENT_ID } from '@kbn/agent-builder-common';
import { SubagentTracker } from './subagent_tracker';

describe('SubagentTracker', () => {
  describe('constructor normalization', () => {
    it('accepts new-shape entries as-is', () => {
      const tracker = new SubagentTracker({
        researcher: { conversation_id: 'conv-1', agent_id: 'agent-a' },
      });
      expect(tracker.snapshot()).toEqual({
        researcher: { conversation_id: 'conv-1', agent_id: 'agent-a' },
      });
    });

    it('normalizes legacy string entries to SubagentEntry with _self agent_id', () => {
      const tracker = new SubagentTracker({
        // Pre-persistent-mode data: value was a bare conversation id string.
        researcher: 'conv-legacy' as unknown as string,
      });
      expect(tracker.snapshot()).toEqual({
        researcher: { conversation_id: 'conv-legacy', agent_id: SELF_AGENT_ID },
      });
    });

    it('mixes legacy strings and new-shape entries', () => {
      const tracker = new SubagentTracker({
        old: 'conv-old' as unknown as string,
        new: { conversation_id: 'conv-new', agent_id: 'agent-x' },
      });
      expect(tracker.snapshot()).toEqual({
        old: { conversation_id: 'conv-old', agent_id: SELF_AGENT_ID },
        new: { conversation_id: 'conv-new', agent_id: 'agent-x' },
      });
    });
  });

  describe('register', () => {
    it('writes the entry with the provided real agent_id', () => {
      const tracker = new SubagentTracker();
      tracker.register({
        name: 'coder',
        conversation_id: 'conv-2',
        agent_id: 'agent-b',
      });
      expect(tracker.snapshot().coder).toEqual({
        conversation_id: 'conv-2',
        agent_id: 'agent-b',
      });
    });

    it('writes the entry with the SELF_AGENT_ID sentinel when the caller passes it', () => {
      const tracker = new SubagentTracker();
      tracker.register({
        name: 'self-copy',
        conversation_id: 'conv-3',
        agent_id: SELF_AGENT_ID,
      });
      expect(tracker.snapshot()['self-copy'].agent_id).toBe(SELF_AGENT_ID);
    });

    it('bumps creation counters', () => {
      const tracker = new SubagentTracker();
      expect(tracker.hasCreations()).toBe(false);
      expect(tracker.creationCount()).toBe(0);
      tracker.register({ name: 'a', conversation_id: 'c', agent_id: 'x' });
      expect(tracker.hasCreations()).toBe(true);
      expect(tracker.creationCount()).toBe(1);
    });
  });

  describe('get', () => {
    it('returns the full SubagentEntry when present', () => {
      const tracker = new SubagentTracker({
        r: { conversation_id: 'c1', agent_id: 'a' },
      });
      expect(tracker.get('r')).toEqual({ conversation_id: 'c1', agent_id: 'a' });
    });

    it('returns undefined when the name is not tracked', () => {
      const tracker = new SubagentTracker();
      expect(tracker.get('missing')).toBeUndefined();
    });
  });

  describe('activeRoster', () => {
    it('preserves the SubagentRosterEntry shape (no agent_id leaked into it)', () => {
      const tracker = new SubagentTracker();
      tracker.register({
        name: 'a',
        conversation_id: 'c-a',
        agent_id: 'agent-x',
        purpose: 'do a thing',
      });
      expect(tracker.activeRoster()).toEqual([
        { name: 'a', conversation_id: 'c-a', purpose: 'do a thing' },
      ]);
    });

    it('carries purposes from prior rounds for pre-existing entries', () => {
      const tracker = new SubagentTracker({
        r: { conversation_id: 'c-r', agent_id: 'agent-y' },
      });
      expect(tracker.activeRoster({ r: 'summarize' })).toEqual([
        { name: 'r', conversation_id: 'c-r', purpose: 'summarize' },
      ]);
    });
  });
});
