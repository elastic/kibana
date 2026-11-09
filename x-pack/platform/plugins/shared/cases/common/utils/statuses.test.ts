/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../types/domain';
import {
  findStatusByKey,
  getBuiltInStatuses,
  getDefaultStatus,
  getEffectiveStatuses,
} from './statuses';

describe('statuses utils', () => {
  const configured = [
    {
      key: 'awaiting_customer',
      label: 'Awaiting customer',
      category: CaseStatuses['in-progress'],
      order: 2,
      isDefault: false,
      disabled: false,
    },
    {
      key: 'open',
      label: 'Open',
      category: CaseStatuses.open,
      order: 0,
      isDefault: true,
      disabled: false,
    },
    {
      key: 'in-progress',
      label: 'Investigating',
      category: CaseStatuses['in-progress'],
      order: 1,
      isDefault: true,
      disabled: false,
    },
  ];

  describe('getBuiltInStatuses', () => {
    it('returns the three built-in statuses as defaults keyed by their category', () => {
      expect(getBuiltInStatuses()).toEqual([
        {
          key: 'open',
          label: 'Open',
          category: 'open',
          order: 0,
          isDefault: true,
          disabled: false,
        },
        {
          key: 'in-progress',
          label: 'In progress',
          category: 'in-progress',
          order: 1,
          isDefault: true,
          disabled: false,
        },
        {
          key: 'closed',
          label: 'Closed',
          category: 'closed',
          order: 2,
          isDefault: true,
          disabled: false,
        },
      ]);
    });
  });

  describe('getEffectiveStatuses', () => {
    it('falls back to the built-in statuses when nothing is configured', () => {
      expect(getEffectiveStatuses(undefined)).toEqual(getBuiltInStatuses());
      expect(getEffectiveStatuses(null)).toEqual(getBuiltInStatuses());
      expect(getEffectiveStatuses([])).toEqual(getBuiltInStatuses());
    });

    it('returns the configured statuses sorted by order', () => {
      expect(getEffectiveStatuses(configured).map((status) => status.key)).toEqual([
        'open',
        'in-progress',
        'awaiting_customer',
      ]);
    });

    it('does not mutate the configured array', () => {
      const copy = [...configured];
      getEffectiveStatuses(configured);
      expect(configured).toEqual(copy);
    });
  });

  describe('getDefaultStatus', () => {
    it('returns the default status of the category', () => {
      expect(getDefaultStatus(configured, CaseStatuses['in-progress'])?.key).toBe('in-progress');
    });

    it('returns undefined when the category has no default', () => {
      expect(getDefaultStatus(configured, CaseStatuses.closed)).toBeUndefined();
    });
  });

  describe('findStatusByKey', () => {
    it('finds a status by key', () => {
      expect(findStatusByKey(configured, 'awaiting_customer')?.label).toBe('Awaiting customer');
    });

    it('returns undefined for an unknown key', () => {
      expect(findStatusByKey(configured, 'missing')).toBeUndefined();
    });
  });
});
