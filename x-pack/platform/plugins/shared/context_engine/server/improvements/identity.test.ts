/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidImprovementError } from './errors';
import { buildChangeFingerprint, buildImprovementId } from './identity';

describe('buildChangeFingerprint', () => {
  it('describes the proposed fix for target-bearing actions', () => {
    expect(
      buildChangeFingerprint({ action: 'remove_workflow', target: { workflow_id: 'wf-1' } })
    ).toBe('remove_workflow:wf-1');
    expect(buildChangeFingerprint({ action: 'edit_ki', target: { ki_id: 'ki-1' } })).toBe(
      'edit_ki:ki-1'
    );
    expect(
      buildChangeFingerprint({ action: 'remove_source', target: { source_value: 'FROM logs-*' } })
    ).toBe('remove_source:FROM logs-*');
  });

  it('uses `subject` for the add_* actions, which have no existing target', () => {
    expect(buildChangeFingerprint({ action: 'add_ki', target: { subject: 'logs-app' } })).toBe(
      'add_ki:logs-app'
    );
    expect(
      buildChangeFingerprint({ action: 'add_workflow', target: { subject: 'logs-app' } })
    ).toBe('add_workflow:logs-app');
  });

  it('ignores the free text an agent rewords between runs', () => {
    const first = buildChangeFingerprint({ action: 'edit_ki', target: { ki_id: 'ki-1' } });
    const second = buildChangeFingerprint({ action: 'edit_ki', target: { ki_id: 'ki-1' } });
    expect(first).toBe(second);
    expect(first).not.toMatch(/title|rationale/i);
  });

  it('distinguishes different actions on the same target', () => {
    expect(
      buildChangeFingerprint({ action: 'edit_workflow', target: { workflow_id: 'wf-1' } })
    ).not.toBe(
      buildChangeFingerprint({ action: 'remove_workflow', target: { workflow_id: 'wf-1' } })
    );
  });

  it('rejects a proposal that cannot be given a stable identity', () => {
    expect(() => buildChangeFingerprint({ action: 'remove_workflow' })).toThrow(
      InvalidImprovementError
    );
    expect(() =>
      buildChangeFingerprint({ action: 'edit_ki', target: { workflow_id: 'wf-1' } })
    ).toThrow("requires 'target.ki_id'");
    expect(() => buildChangeFingerprint({ action: 'add_ki', target: {} })).toThrow(
      "requires 'target.subject'"
    );
  });
});

describe('buildImprovementId', () => {
  const proposal = { action: 'remove_workflow' as const, target: { workflow_id: 'wf-1' } };

  it('is stable across runs, so a re-proposal appends a revision instead of duplicating', () => {
    expect(buildImprovementId({ aiIndexId: 'sales', ...proposal })).toBe(
      buildImprovementId({ aiIndexId: 'sales', ...proposal })
    );
  });

  it('is scoped to the AI index', () => {
    expect(buildImprovementId({ aiIndexId: 'sales', ...proposal })).not.toBe(
      buildImprovementId({ aiIndexId: 'support', ...proposal })
    );
  });

  it('cannot be collided by splicing the AI index id into the fingerprint', () => {
    expect(
      buildImprovementId({
        aiIndexId: 'a',
        action: 'remove_workflow',
        target: { workflow_id: 'b' },
      })
    ).not.toBe(
      buildImprovementId({
        aiIndexId: 'a:remove_workflow',
        action: 'remove_workflow',
        target: { workflow_id: 'b' },
      })
    );
  });

  it('is a short lowercase hex digest', () => {
    expect(buildImprovementId({ aiIndexId: 'sales', ...proposal })).toMatch(/^[0-9a-f]{32}$/);
  });
});
