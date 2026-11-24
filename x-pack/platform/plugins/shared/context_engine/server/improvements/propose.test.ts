/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Improvement } from '../../common/http_api/improvements';
import {
  addedKiIdFor,
  isProposable,
  proposalAnchorFor,
  proposalIdFor,
  toProposal,
} from './propose';

const improvement = (overrides: Partial<Improvement> = {}): Improvement =>
  ({
    improvement_id: 'abc',
    ai_index_id: 'orders',
    action: 'add_ki',
    title: 'Add a KI',
    rationale: 'Because.',
    payload: { ki: { type: 'document', title: 'T' } },
    ...overrides,
  } as Improvement);

describe('improvement proposals', () => {
  it('can propose the KI actions and no others', () => {
    expect(['add_ki', 'edit_ki', 'remove_ki'].every((a) => isProposable(a as never))).toBe(true);
    expect(
      [
        'add_workflow',
        'edit_workflow',
        'remove_workflow',
        'add_source',
        'edit_source',
        'remove_source',
      ].some((a) => isProposable(a as never))
    ).toBe(false);
  });

  it('derives the proposal id and anchor from the improvement and the AI index', () => {
    expect(proposalIdFor('abc')).toBe('context-engine-abc');
    expect(proposalAnchorFor('orders')).toBe('context-engine:orders');
    expect(addedKiIdFor('abc')).toBe('improvement-abc');
  });

  it('names the KI an add creates, so the approval target is known before it runs', () => {
    expect(toProposal(improvement())).toEqual(
      expect.objectContaining({
        actionWorkflowId: 'system-context-engine-action-add-ki',
        actionInput: {
          ai_index_id: 'orders',
          ki_id: 'improvement-abc',
          ki: { type: 'document', title: 'T' },
        },
      })
    );
  });

  it('carries the target and patch of an edit', () => {
    expect(
      toProposal(
        improvement({
          action: 'edit_ki',
          target: { ki_id: 'ki-1' },
          payload: { ki_patch: { title: 'New' } },
        })
      )?.actionInput
    ).toEqual({ ai_index_id: 'orders', ki_id: 'ki-1', ki_patch: { title: 'New' } });
  });

  it('carries only the target of a removal', () => {
    expect(
      toProposal(improvement({ action: 'remove_ki', target: { ki_id: 'ki-1' }, payload: {} }))
        ?.actionInput
    ).toEqual({ ai_index_id: 'orders', ki_id: 'ki-1' });
  });

  it('proposes nothing for an action without an action workflow', () => {
    expect(toProposal(improvement({ action: 'add_source' }))).toBeUndefined();
  });
});
