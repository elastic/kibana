/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_CASE_STATUS_KEY_LENGTH } from '../../../../common/constants';
import type { CaseStatusDefinition } from '../../../../common/types/domain';
import { DEFAULT_CASE_STATUSES } from '../../../../common/utils/statuses';
import {
  addStatus,
  generateStatusKey,
  isLabelTaken,
  moveStatus,
  setDefaultStatus,
  toggleStatusDisabled,
  updateStatus,
} from './utils';

const triage: CaseStatusDefinition = {
  key: 'triage',
  label: 'Triage',
  color: 'accent',
  category: 'not_started',
  order: 1,
  isDefault: false,
  disabled: false,
};
const retired: CaseStatusDefinition = { ...triage, key: 'retired', label: 'Retired', order: 2 };
const statuses: CaseStatusDefinition[] = [
  { ...DEFAULT_CASE_STATUSES[0], order: 0 },
  triage,
  { ...retired, disabled: true },
  { ...DEFAULT_CASE_STATUSES[1], order: 3 },
  { ...DEFAULT_CASE_STATUSES[2], order: 4 },
];
const keys = (list: CaseStatusDefinition[]) => list.map(({ key }) => key);

describe('statuses settings utils', () => {
  describe('generateStatusKey', () => {
    it('turns the label into a key', () => {
      expect(generateStatusKey('  Awaiting Customer!  ', [])).toBe('awaiting_customer');
      expect(generateStatusKey('In-review_2', [])).toBe('in-review_2');
    });

    it('adds a suffix when the key is taken', () => {
      expect(generateStatusKey('Triage', ['triage', 'triage_2'])).toBe('triage_3');
    });

    it('falls back to a generic key when the label has no usable characters', () => {
      expect(generateStatusKey('Été ✓', [])).toBe('t');
      expect(generateStatusKey('✓✓', [])).toBe('status');
    });

    it('keeps keys within the length limit', () => {
      const label = 'a'.repeat(80);
      expect(generateStatusKey(label, [])).toHaveLength(MAX_CASE_STATUS_KEY_LENGTH);
      expect(generateStatusKey(label, ['a'.repeat(MAX_CASE_STATUS_KEY_LENGTH)])).toHaveLength(
        MAX_CASE_STATUS_KEY_LENGTH
      );
    });
  });

  it('adds a status at the end with a generated key', () => {
    const next = addStatus(statuses, { label: ' On hold ', color: 'warning', category: 'active' });

    expect(next.at(-1)).toEqual({
      key: 'on_hold',
      label: 'On hold',
      color: 'warning',
      category: 'active',
      order: 5,
      isDefault: false,
      disabled: false,
    });
  });

  it('renames and recolors a status, keeping its key and category', () => {
    const next = updateStatus(statuses, 'triage', { label: 'Sorting', color: 'primary' });

    expect(next[1]).toEqual({ ...triage, label: 'Sorting', color: 'primary' });
  });

  describe('moveStatus', () => {
    it('swaps with the enabled neighbor and renumbers the order', () => {
      const next = moveStatus(statuses, 'in-progress', 'up');

      expect(keys(next)).toEqual(['open', 'in-progress', 'retired', 'triage', 'closed']);
      expect(next.map(({ order }) => order)).toEqual([0, 1, 2, 3, 4]);
    });

    it('does nothing at the ends of the list', () => {
      expect(moveStatus(statuses, 'open', 'up')).toBe(statuses);
      expect(moveStatus(statuses, 'closed', 'down')).toBe(statuses);
    });
  });

  it('makes a status the only default of its category', () => {
    const next = setDefaultStatus(statuses, 'triage');

    expect(next.filter(({ isDefault }) => isDefault).map(({ key }) => key)).toEqual([
      'triage',
      'in-progress',
      'closed',
    ]);
  });

  it('toggles whether a status is disabled', () => {
    expect(toggleStatusDisabled(statuses, 'triage')[1].disabled).toBe(true);
    expect(toggleStatusDisabled(statuses, 'retired')[2].disabled).toBe(false);
  });

  it('finds labels used by other statuses, ignoring case', () => {
    expect(isLabelTaken(statuses, ' triage ')).toBe(true);
    expect(isLabelTaken(statuses, 'Triage', 'triage')).toBe(false);
    expect(isLabelTaken(statuses, 'New')).toBe(false);
  });
});
