/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SELF_AGENT_ID } from '@kbn/agent-builder-common';
import { filterReachableSubagents } from './filter_reachable_subagents';

describe('filterReachableSubagents', () => {
  it('returns empty on empty entries', () => {
    expect(filterReachableSubagents({ entries: {}, allowedIds: new Set(['a']) })).toEqual({});
  });

  it('returns all entries when every backing agent_id is allowed', () => {
    const entries = {
      r: { conversation_id: 'c1', agent_id: 'a' },
      s: { conversation_id: 'c2', agent_id: 'b' },
    };
    expect(filterReachableSubagents({ entries, allowedIds: new Set(['a', 'b']) })).toEqual(entries);
  });

  it('drops entries whose backing agent_id is not allowed', () => {
    const entries = {
      r: { conversation_id: 'c1', agent_id: 'a' },
      s: { conversation_id: 'c2', agent_id: 'b' },
    };
    expect(filterReachableSubagents({ entries, allowedIds: new Set(['a']) })).toEqual({
      r: { conversation_id: 'c1', agent_id: 'a' },
    });
  });

  it('matches _self exactly (sentinel-to-sentinel)', () => {
    const entries = {
      self: { conversation_id: 'c-self', agent_id: SELF_AGENT_ID },
    };
    expect(filterReachableSubagents({ entries, allowedIds: new Set([SELF_AGENT_ID]) })).toEqual(
      entries
    );

    expect(filterReachableSubagents({ entries, allowedIds: new Set(['a']) })).toEqual({});
  });

  it('preserves entry ordering', () => {
    const entries: Record<string, { conversation_id: string; agent_id: string }> = {
      first: { conversation_id: 'c1', agent_id: 'a' },
      second: { conversation_id: 'c2', agent_id: 'b' },
      third: { conversation_id: 'c3', agent_id: 'a' },
    };
    const out = filterReachableSubagents({
      entries,
      allowedIds: new Set(['a']),
    });
    expect(Object.keys(out)).toEqual(['first', 'third']);
  });
});
