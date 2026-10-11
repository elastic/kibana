/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentApprovalsEqual, normalizeAgentApprovals } from './approvals';
import type { AgentApprovals } from './definition';

const approvals: AgentApprovals = { auto_approved_apis: { elasticsearch: ['indices.delete'] } };

describe('normalizeAgentApprovals', () => {
  it('deduplicates and sorts selectors and drops empty backends', () => {
    expect(
      normalizeAgentApprovals({
        auto_approved_apis: {
          elasticsearch: ['indices.delete', '*', 'indices.delete'],
          kibana: [],
        },
      })
    ).toEqual({ auto_approved_apis: { elasticsearch: ['*', 'indices.delete'] } });
  });

  it.each([
    ['missing defaults', undefined],
    ['no backends', { auto_approved_apis: {} }],
    ['only empty backends', { auto_approved_apis: { elasticsearch: [], kibana: [] } }],
  ])('returns undefined for %s', (_label, value) => {
    expect(normalizeAgentApprovals(value)).toBeUndefined();
  });
});

describe('agentApprovalsEqual', () => {
  it('ignores order, duplicates, and empty backends', () => {
    expect(
      agentApprovalsEqual(
        { auto_approved_apis: { elasticsearch: ['b', 'a'], kibana: [] } },
        { auto_approved_apis: { elasticsearch: ['a', 'b', 'a'] } }
      )
    ).toBe(true);
    expect(agentApprovalsEqual(undefined, { auto_approved_apis: { elasticsearch: [] } })).toBe(
      true
    );
  });

  it('detects added or removed selectors', () => {
    expect(agentApprovalsEqual(undefined, approvals)).toBe(false);
    expect(agentApprovalsEqual(approvals, undefined)).toBe(false);
  });
});
