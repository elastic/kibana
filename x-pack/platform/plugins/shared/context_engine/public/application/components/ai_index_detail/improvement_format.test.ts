/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IMPROVEMENT_ACTIONS,
  IMPROVEMENT_STATUSES,
  OPEN_IMPROVEMENT_STATUSES,
} from '../../../../common/http_api/improvements';
import {
  actionBadgeColor,
  actionLabel,
  isOpen,
  statusBadgeColor,
  statusLabel,
  targetLabel,
} from './improvement_format';
import { buildImprovement } from './improvement_test_fixtures';

describe('actionLabel', () => {
  it('labels every action in the reviewer’s terms', () => {
    expect(IMPROVEMENT_ACTIONS.map(actionLabel)).toEqual([
      'Add knowledge indicator',
      'Edit knowledge indicator',
      'Remove knowledge indicator',
      'Add automation',
      'Edit automation',
      'Remove automation',
    ]);
  });
});

describe('actionBadgeColor', () => {
  it('marks additions as new and removals as destructive', () => {
    expect(actionBadgeColor('add_ki')).toBe('success');
    expect(actionBadgeColor('add_workflow')).toBe('success');
    expect(actionBadgeColor('remove_ki')).toBe('danger');
    expect(actionBadgeColor('remove_workflow')).toBe('danger');
  });

  it('leaves edits neutral', () => {
    expect(actionBadgeColor('edit_ki')).toBe('hollow');
    expect(actionBadgeColor('edit_workflow')).toBe('hollow');
  });
});

describe('statusLabel', () => {
  it('labels every status', () => {
    expect(IMPROVEMENT_STATUSES.map(statusLabel)).toEqual([
      'Awaiting review',
      'Applied',
      'Rejected',
      'Failed to apply',
    ]);
  });
});

describe('statusBadgeColor', () => {
  it('distinguishes a failed apply from a rejection', () => {
    expect(statusBadgeColor('failed')).toBe('danger');
    expect(statusBadgeColor('rejected')).toBe('default');
  });
});

describe('targetLabel', () => {
  it('names the knowledge indicator or workflow being changed', () => {
    expect(targetLabel(buildImprovement({ target: { ki_id: 'ki-1' } }))).toBe('ki-1');
    expect(targetLabel(buildImprovement({ target: { workflow_id: 'wf-1' } }))).toBe('wf-1');
  });

  it('has nothing to name for an addition, which creates its own target', () => {
    expect(targetLabel(buildImprovement())).toBeUndefined();
  });
});

describe('isOpen', () => {
  it('agrees with the statuses the route treats as awaiting the user', () => {
    expect(IMPROVEMENT_STATUSES.filter(isOpen)).toEqual([...OPEN_IMPROVEMENT_STATUSES]);
  });
});
