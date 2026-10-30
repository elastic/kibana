/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-components/src/status/types';
import type { CaseStatusDefinition } from '../types/domain/space_settings/v1';
import {
  DEFAULT_CASE_STATUSES,
  StatusWriteError,
  getCaseStatus,
  getEffectiveStatuses,
  resolveStatusWrite,
  validateStatuses,
} from './statuses';

const triage: CaseStatusDefinition = {
  key: 'triage',
  label: 'Triage',
  color: 'accent',
  category: 'not_started',
  order: 3,
  isDefault: false,
  disabled: false,
};
const contained: CaseStatusDefinition = {
  key: 'contained',
  label: 'Contained',
  color: 'warning',
  category: 'active',
  order: 4,
  isDefault: false,
  disabled: false,
};
const retired: CaseStatusDefinition = {
  ...contained,
  key: 'retired',
  label: 'Retired',
  disabled: true,
};
const statuses = [...DEFAULT_CASE_STATUSES, triage, contained, retired];

describe('statuses', () => {
  describe('getEffectiveStatuses', () => {
    it('seeds the three default statuses when a space never saved any', () => {
      expect(getEffectiveStatuses(undefined).map(({ key }) => key)).toEqual([
        'open',
        'in-progress',
        'closed',
      ]);
    });

    it('returns saved statuses in admin order', () => {
      expect(
        getEffectiveStatuses({ statuses: [contained, { ...triage, order: 0 }] }).map(
          ({ key }) => key
        )
      ).toEqual(['triage', 'contained']);
    });
  });

  describe('getCaseStatus', () => {
    it("reads a case with no status_key as its category's default", () => {
      expect(getCaseStatus(statuses, { status: CaseStatuses['in-progress'] }).key).toBe(
        'in-progress'
      );
    });

    it('reads the stored status_key', () => {
      expect(getCaseStatus(statuses, { status: CaseStatuses.open, statusKey: 'triage' }).key).toBe(
        'triage'
      );
    });
  });

  describe('resolveStatusWrite', () => {
    it('sets status to the category of the status_key', () => {
      expect(resolveStatusWrite({ statuses, statusKey: 'contained' })).toEqual({
        status: CaseStatuses['in-progress'],
        status_key: 'contained',
      });
    });

    it("moves a status-only write to the category's default", () => {
      expect(
        resolveStatusWrite({
          statuses,
          status: CaseStatuses.closed,
          current: { status: CaseStatuses.open, statusKey: 'triage' },
        })
      ).toEqual({ status: CaseStatuses.closed, status_key: 'closed' });
    });

    it('keeps the current status when a status-only write stays in its category', () => {
      expect(
        resolveStatusWrite({
          statuses,
          status: CaseStatuses['in-progress'],
          current: { status: CaseStatuses['in-progress'], statusKey: 'contained' },
        })
      ).toEqual({ status: CaseStatuses['in-progress'], status_key: 'contained' });
    });

    it('rejects an unknown, disabled, or mismatched status', () => {
      expect(() => resolveStatusWrite({ statuses, statusKey: 'nope' })).toThrow(StatusWriteError);
      expect(() => resolveStatusWrite({ statuses, statusKey: 'retired' })).toThrow('disabled');
      expect(() =>
        resolveStatusWrite({ statuses, statusKey: 'triage', status: CaseStatuses.closed })
      ).toThrow('does not match');
    });

    it('allows keeping a case in a status that was disabled after it moved there', () => {
      expect(
        resolveStatusWrite({
          statuses,
          statusKey: 'retired',
          current: { status: CaseStatuses['in-progress'], statusKey: 'retired' },
        })
      ).toEqual({ status: CaseStatuses['in-progress'], status_key: 'retired' });
    });

    it('returns nothing when the write does not touch the status', () => {
      expect(resolveStatusWrite({ statuses })).toBeUndefined();
    });
  });

  describe('validateStatuses', () => {
    it('accepts the defaults plus custom statuses', () => {
      expect(validateStatuses(statuses, DEFAULT_CASE_STATUSES)).toEqual([]);
    });

    it('requires exactly one enabled default per category', () => {
      const errors = validateStatuses(
        statuses.map((status) =>
          status.key === 'triage' ? { ...status, isDefault: true } : status
        ),
        []
      );
      expect(errors).toContain('Choose exactly one default status for the not_started category.');
      expect(
        validateStatuses(
          statuses.map((status) =>
            status.key === 'open' ? { ...status, disabled: true } : status
          ),
          []
        )
      ).toContain('"Open" is a default status, so it cannot be disabled.');
    });

    it('rejects duplicate keys and names', () => {
      const errors = validateStatuses([...statuses, { ...triage, order: 9 }], []);
      expect(errors).toContain('The key "triage" is used by more than one status.');
      expect(errors).toContain('The name "Triage" is used by more than one status.');
    });

    it('rejects deleting a saved status or moving it to another category', () => {
      expect(validateStatuses(DEFAULT_CASE_STATUSES, statuses)).toContain(
        '"Triage" cannot be deleted. Disable it instead.'
      );
      expect(
        validateStatuses(
          statuses.map((status) =>
            status.key === 'triage' ? { ...status, category: 'active' as const } : status
          ),
          statuses
        )
      ).toContain('The category of "Triage" cannot change.');
    });
  });
});
