/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../../common/types/domain';
import { getBuiltInStatuses } from '../../../../common/utils/statuses';
import {
  generateStatusKey,
  getDisableBlocker,
  moveStatus,
  setDefaultStatus,
  toggleStatusDisabled,
  upsertStatus,
} from './utils';

const custom = (key: string, label: string, order: number) => ({
  key,
  label,
  category: CaseStatuses['in-progress'],
  order,
  isDefault: false,
  disabled: false,
});

const statuses = [
  ...getBuiltInStatuses(),
  custom('awaiting_customer', 'Awaiting customer', 3),
  custom('on_hold', 'On hold', 4),
];

const keys = (list: Array<{ key: string }>) => list.map((status) => status.key);

describe('statuses utils', () => {
  describe('generateStatusKey', () => {
    it('slugifies the label', () => {
      expect(generateStatusKey('  Awaiting  Customer!  ', [])).toBe('awaiting_customer');
    });

    it('suffixes a key that already exists', () => {
      expect(generateStatusKey('Open', ['open'])).toBe('open_2');
      expect(generateStatusKey('Open', ['open', 'open_2'])).toBe('open_3');
    });

    it('falls back to a generated key for labels without latin characters', () => {
      expect(generateStatusKey('待機中', [])).toMatch(/^status_[0-9a-f]{8}$/);
    });

    it('never exceeds the maximum key length', () => {
      const key = generateStatusKey('a'.repeat(80), ['a'.repeat(50)]);

      expect(key.length).toBeLessThanOrEqual(50);
      expect(key.endsWith('_2')).toBe(true);
    });
  });

  describe('upsertStatus', () => {
    it('appends a new status and renumbers the order', () => {
      const result = upsertStatus(statuses, custom('review', 'Review', 99));

      expect(keys(result)).toEqual([...keys(statuses), 'review']);
      expect(result.map((status) => status.order)).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('replaces an existing status in place', () => {
      const result = upsertStatus(statuses, { ...statuses[3], label: 'Waiting' });

      expect(result[3].label).toBe('Waiting');
      expect(keys(result)).toEqual(keys(statuses));
    });

    it('starts from the built-in statuses when nothing is configured', () => {
      expect(keys(upsertStatus([], custom('review', 'Review', 0)))).toEqual([
        'open',
        'in-progress',
        'closed',
        'review',
      ]);
    });
  });

  describe('moveStatus', () => {
    it('swaps a status with its neighbor of the same category, skipping other categories', () => {
      // "closed" sits between the in-progress statuses; moving up must skip over it.
      const result = moveStatus(statuses, 'awaiting_customer', 'up');

      expect(keys(result)).toEqual([
        'open',
        'awaiting_customer',
        'closed',
        'in-progress',
        'on_hold',
      ]);
      expect(result.map((status) => status.order)).toEqual([0, 1, 2, 3, 4]);
    });

    it('does nothing at the edge of the category', () => {
      expect(keys(moveStatus(statuses, 'on_hold', 'down'))).toEqual(keys(statuses));
      expect(keys(moveStatus(statuses, 'open', 'up'))).toEqual(keys(statuses));
    });
  });

  describe('setDefaultStatus', () => {
    it('moves the default within the category only', () => {
      const result = setDefaultStatus(statuses, 'on_hold');

      expect(result.find((status) => status.key === 'on_hold')?.isDefault).toBe(true);
      expect(result.find((status) => status.key === 'in-progress')?.isDefault).toBe(false);
      expect(result.find((status) => status.key === 'open')?.isDefault).toBe(true);
    });
  });

  describe('toggleStatusDisabled', () => {
    it('flips the disabled flag of the status', () => {
      const disabled = toggleStatusDisabled(statuses, 'on_hold');

      expect(disabled.find((status) => status.key === 'on_hold')?.disabled).toBe(true);
      expect(
        toggleStatusDisabled(disabled, 'on_hold').find((status) => status.key === 'on_hold')
          ?.disabled
      ).toBe(false);
    });
  });

  describe('getDisableBlocker', () => {
    it('blocks the default status', () => {
      expect(getDisableBlocker(statuses, statuses[1])).toBe('default');
    });

    it('blocks the last enabled status of a category', () => {
      expect(getDisableBlocker(statuses, statuses[2])).toBe('default');
      const closedDuplicate = {
        ...custom('closed_duplicate', 'Closed duplicate', 5),
        category: CaseStatuses.closed,
      };
      const withDisabledClosed = [
        ...statuses.map((status) =>
          status.key === 'closed' ? { ...status, isDefault: false, disabled: true } : status
        ),
        { ...closedDuplicate, isDefault: true },
      ];

      expect(getDisableBlocker(withDisabledClosed, { ...closedDuplicate, isDefault: false })).toBe(
        'last'
      );
    });

    it('allows disabling a non-default status with enabled siblings', () => {
      expect(getDisableBlocker(statuses, statuses[4])).toBeUndefined();
    });
  });
});
