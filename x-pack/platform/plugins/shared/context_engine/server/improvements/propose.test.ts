/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposedImprovement } from '../../common/http_api/improvements';
import { buildImprovementId, toImprovementEnvelope } from './propose';

const SUGGESTED_AT = '2026-08-20T09:00:00.000Z';

const proposal = (overrides: Partial<ProposedImprovement> = {}): ProposedImprovement => ({
  action: 'add_ki',
  title: 'Document the refund window',
  rationale: 'Three unanswered questions mentioned refunds.',
  ...overrides,
});

describe('buildImprovementId', () => {
  it('is stable across runs for the same suggestion', () => {
    const args = { aiIndexId: 'support', proposal: proposal() };

    expect(buildImprovementId(args)).toBe(buildImprovementId(args));
  });

  it('ignores casing and whitespace differences in the title', () => {
    expect(buildImprovementId({ aiIndexId: 'support', proposal: proposal() })).toBe(
      buildImprovementId({
        aiIndexId: 'support',
        proposal: proposal({ title: '  Document   the Refund Window ' }),
      })
    );
  });

  it('ignores the rationale, which is wording rather than identity', () => {
    expect(buildImprovementId({ aiIndexId: 'support', proposal: proposal() })).toBe(
      buildImprovementId({
        aiIndexId: 'support',
        proposal: proposal({ rationale: 'Refunds came up repeatedly.' }),
      })
    );
  });

  it.each([
    ['a different AI index', { aiIndexId: 'billing', proposal: proposal() }],
    ['a different action', { aiIndexId: 'support', proposal: proposal({ action: 'remove_ki' }) }],
    [
      'a different title',
      { aiIndexId: 'support', proposal: proposal({ title: 'Something else' }) },
    ],
    [
      'a different KI target',
      { aiIndexId: 'support', proposal: proposal({ target_ki_id: 'ki-1' }) },
    ],
    [
      'a different workflow target',
      { aiIndexId: 'support', proposal: proposal({ target_workflow_id: 'wf-1' }) },
    ],
  ] as Array<[string, { aiIndexId: string; proposal: ProposedImprovement }]>)(
    'differs for %s',
    (_label, args) => {
      expect(buildImprovementId(args)).not.toBe(
        buildImprovementId({ aiIndexId: 'support', proposal: proposal() })
      );
    }
  );
});

describe('toImprovementEnvelope', () => {
  it('records a proposal as proposed, with its run and timestamp', () => {
    const envelope = toImprovementEnvelope({
      aiIndexId: 'support',
      proposal: proposal({ confidence: 0.8, signal_tags: ['coverage_gap'] }),
      runId: 'exec-1',
      suggestedAt: SUGGESTED_AT,
    });

    expect(envelope).toEqual({
      improvement_id: expect.any(String),
      ai_index_id: 'support',
      status: 'proposed',
      action: 'add_ki',
      title: 'Document the refund window',
      rationale: 'Three unanswered questions mentioned refunds.',
      signal_tags: ['coverage_gap'],
      payload: {},
      confidence: 0.8,
      run_id: 'exec-1',
      suggested_at: SUGGESTED_AT,
    });
  });

  it('moves the flat target ids into the target object', () => {
    const envelope = toImprovementEnvelope({
      aiIndexId: 'support',
      proposal: proposal({ action: 'edit_ki', target_ki_id: 'ki-1' }),
      suggestedAt: SUGGESTED_AT,
    });

    expect(envelope.target).toEqual({ ki_id: 'ki-1' });
  });

  it('carries the KI body and workflow definition in the payload', () => {
    const envelope = toImprovementEnvelope({
      aiIndexId: 'support',
      proposal: proposal({ ki: { title: 'Refund window' }, workflow_yaml: 'name: x' }),
      suggestedAt: SUGGESTED_AT,
    });

    expect(envelope.payload).toEqual({ ki: { title: 'Refund window' }, workflow_yaml: 'name: x' });
  });

  it('omits optional fields the agent left out rather than storing empties', () => {
    const envelope = toImprovementEnvelope({
      aiIndexId: 'support',
      proposal: proposal({ signal_tags: [], signal_ids: [] }),
      suggestedAt: SUGGESTED_AT,
    });

    expect(envelope).not.toHaveProperty('target');
    expect(envelope).not.toHaveProperty('confidence');
    expect(envelope).not.toHaveProperty('run_id');
    expect(envelope).not.toHaveProperty('signal_tags');
    expect(envelope).not.toHaveProperty('signal_ids');
  });
});
