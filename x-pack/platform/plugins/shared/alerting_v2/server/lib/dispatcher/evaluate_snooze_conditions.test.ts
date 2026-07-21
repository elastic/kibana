/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnoozeCondition } from '@kbn/alerting-v2-schemas';
import { shouldUnsnoozeByConditions } from './evaluate_snooze_conditions';
import { createAlertEpisode } from './fixtures/test_utils';
import type { SnoozeBaseline } from './types';

describe('shouldUnsnoozeByConditions', () => {
  describe('eq on severity', () => {
    const conditions: SnoozeCondition[] = [
      { field: 'severity', operator: 'eq', value: 'critical' },
    ];

    it('lifts when the current severity equals the value', () => {
      const episode = createAlertEpisode({ severity: 'critical' });
      expect(shouldUnsnoozeByConditions(conditions, 'any', undefined, episode)).toBe(true);
    });

    it('does not lift when the current severity differs', () => {
      const episode = createAlertEpisode({ severity: 'high' });
      expect(shouldUnsnoozeByConditions(conditions, 'any', undefined, episode)).toBe(false);
    });

    it('does not lift when the current severity is missing', () => {
      const episode = createAlertEpisode({ severity: undefined });
      expect(shouldUnsnoozeByConditions(conditions, 'any', undefined, episode)).toBe(false);
    });
  });

  describe('changed on severity', () => {
    const conditions: SnoozeCondition[] = [{ field: 'severity', operator: 'changed' }];

    it('lifts when the current severity differs from the baseline', () => {
      const episode = createAlertEpisode({ severity: 'critical' });
      const baseline: SnoozeBaseline = { severity: 'high' };
      expect(shouldUnsnoozeByConditions(conditions, 'any', baseline, episode)).toBe(true);
    });

    it('does not lift when the current severity equals the baseline', () => {
      const episode = createAlertEpisode({ severity: 'high' });
      const baseline: SnoozeBaseline = { severity: 'high' };
      expect(shouldUnsnoozeByConditions(conditions, 'any', baseline, episode)).toBe(false);
    });

    it('lifts when severity appeared after snooze time (baseline exists without severity)', () => {
      // A field with no value at snooze time counts as changed once it appears (V1 behavior).
      const episode = createAlertEpisode({ severity: 'critical' });
      expect(shouldUnsnoozeByConditions(conditions, 'any', {}, episode)).toBe(true);
    });

    it('does not lift when severity is absent both at snooze time and now', () => {
      const episode = createAlertEpisode({ severity: undefined });
      expect(shouldUnsnoozeByConditions(conditions, 'any', {}, episode)).toBe(false);
    });

    it('does not lift when there is no baseline at all (history unavailable)', () => {
      const episode = createAlertEpisode({ severity: 'critical' });
      expect(shouldUnsnoozeByConditions(conditions, 'any', undefined, episode)).toBe(false);
    });
  });

  describe('changed on a data field', () => {
    const conditions: SnoozeCondition[] = [{ field: 'data.host.name', operator: 'changed' }];

    it('lifts when the watched field changed from the baseline', () => {
      const episode = createAlertEpisode({ data: { host: { name: 'srv-02' } } });
      const baseline: SnoozeBaseline = { data: { host: { name: 'srv-01' } } };
      expect(shouldUnsnoozeByConditions(conditions, 'any', baseline, episode)).toBe(true);
    });

    it('does not lift when the watched field is unchanged', () => {
      const episode = createAlertEpisode({ data: { host: { name: 'srv-01' } } });
      const baseline: SnoozeBaseline = { data: { host: { name: 'srv-01' } } };
      expect(shouldUnsnoozeByConditions(conditions, 'any', baseline, episode)).toBe(false);
    });

    it('lifts when the field appeared after snooze time (baseline exists without the field)', () => {
      const episode = createAlertEpisode({ data: { host: { name: 'srv-02' } } });
      const baseline: SnoozeBaseline = { data: {} };
      expect(shouldUnsnoozeByConditions(conditions, 'any', baseline, episode)).toBe(true);
    });

    it('does not lift when the field is absent both at snooze time and now', () => {
      const episode = createAlertEpisode({ data: {} });
      const baseline: SnoozeBaseline = { data: {} };
      expect(shouldUnsnoozeByConditions(conditions, 'any', baseline, episode)).toBe(false);
    });

    it('lifts when the field disappeared (present at baseline, absent now)', () => {
      const episode = createAlertEpisode({ data: {} });
      const baseline: SnoozeBaseline = { data: { host: { name: 'srv-01' } } };
      expect(shouldUnsnoozeByConditions(conditions, 'any', baseline, episode)).toBe(true);
    });
  });

  describe('match combinator', () => {
    const conditions: SnoozeCondition[] = [
      { field: 'severity', operator: 'eq', value: 'critical' },
      { field: 'data.host.name', operator: 'changed' },
    ];
    const baseline: SnoozeBaseline = { data: { host: { name: 'srv-01' } } };

    it('any (default) lifts when at least one condition is met', () => {
      // severity does not match, but the field changed → any lifts
      const episode = createAlertEpisode({
        severity: 'high',
        data: { host: { name: 'srv-02' } },
      });
      expect(shouldUnsnoozeByConditions(conditions, undefined, baseline, episode)).toBe(true);
    });

    it('all lifts only when every condition is met', () => {
      const onlyOneMet = createAlertEpisode({
        severity: 'high',
        data: { host: { name: 'srv-02' } },
      });
      expect(shouldUnsnoozeByConditions(conditions, 'all', baseline, onlyOneMet)).toBe(false);

      const bothMet = createAlertEpisode({
        severity: 'critical',
        data: { host: { name: 'srv-02' } },
      });
      expect(shouldUnsnoozeByConditions(conditions, 'all', baseline, bothMet)).toBe(true);
    });
  });
});
