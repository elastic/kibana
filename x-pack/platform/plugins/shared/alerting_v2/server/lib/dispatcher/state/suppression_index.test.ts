/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlert, createSuppressionRow } from '../fixtures/test_utils';
import { SuppressionIndex } from './suppression_index';

describe('SuppressionIndex', () => {
  it('suppresses by alert-level match', () => {
    const index = SuppressionIndex.of([
      createSuppressionRow({
        rule_id: 'r1',
        group_hash: 'h1',
        alert_id: 'e1',
        should_suppress: true,
        last_ack_action: 'ack',
      }),
    ]);

    const alert = createAlert({ rule_id: 'r1', group_hash: 'h1', alert_id: 'e1' });
    expect(index.suppressionReasonFor(alert)).toBe('ack');
  });

  it('suppresses by series-level match (null alert_id)', () => {
    const index = SuppressionIndex.of([
      createSuppressionRow({
        rule_id: 'r1',
        group_hash: 'h1',
        alert_id: null,
        should_suppress: true,
        last_snooze_action: 'snooze',
      }),
    ]);

    const alert = createAlert({ rule_id: 'r1', group_hash: 'h1', alert_id: 'e1' });
    expect(index.suppressionReasonFor(alert)).toBe('snooze');
  });

  it('uses deactivate reason when deactivated', () => {
    const index = SuppressionIndex.of([
      createSuppressionRow({
        rule_id: 'r1',
        group_hash: 'h1',
        alert_id: 'e1',
        should_suppress: true,
        last_deactivate_action: 'deactivate',
      }),
    ]);

    const alert = createAlert({ rule_id: 'r1', group_hash: 'h1', alert_id: 'e1' });
    expect(index.suppressionReasonFor(alert)).toBe('deactivate');
  });

  it('falls back to an unknown reason when no action is recorded', () => {
    const index = SuppressionIndex.of([
      createSuppressionRow({
        rule_id: 'r1',
        group_hash: 'h1',
        alert_id: 'e1',
        should_suppress: true,
      }),
    ]);

    const alert = createAlert({ rule_id: 'r1', group_hash: 'h1', alert_id: 'e1' });
    expect(index.suppressionReasonFor(alert)).toBe('unknown suppression reason');
  });

  it('prefers alert-level suppression over series-level', () => {
    const index = SuppressionIndex.of([
      createSuppressionRow({
        rule_id: 'r1',
        group_hash: 'h1',
        alert_id: 'e1',
        should_suppress: true,
        last_ack_action: 'ack',
      }),
      createSuppressionRow({
        rule_id: 'r1',
        group_hash: 'h1',
        alert_id: null,
        should_suppress: true,
        last_snooze_action: 'snooze',
      }),
    ]);

    const alert = createAlert({ rule_id: 'r1', group_hash: 'h1', alert_id: 'e1' });
    expect(index.suppressionReasonFor(alert)).toBe('ack');
  });

  it('does not suppress when should_suppress is false', () => {
    const index = SuppressionIndex.of([
      createSuppressionRow({
        rule_id: 'r1',
        group_hash: 'h1',
        alert_id: 'e1',
        should_suppress: false,
      }),
    ]);

    const alert = createAlert({ rule_id: 'r1', group_hash: 'h1', alert_id: 'e1' });
    expect(index.suppressionReasonFor(alert)).toBeUndefined();
  });

  it('returns undefined for every alert when empty', () => {
    expect(SuppressionIndex.empty().suppressionReasonFor(createAlert())).toBeUndefined();
    expect(SuppressionIndex.empty().size).toBe(0);
  });

  it('suppresses external alert when suppression row uses source as key prefix', () => {
    const index = SuppressionIndex.of([
      createSuppressionRow({
        source: 'pagerduty',
        rule_id: null,
        group_hash: 'pd-hash',
        alert_id: 'pd-ep-1',
        should_suppress: true,
        last_ack_action: 'ack',
      }),
    ]);

    const alert = createAlert({
      source: 'pagerduty',
      rule_id: null,
      group_hash: 'pd-hash',
      alert_id: 'pd-ep-1',
    });
    expect(index.suppressionReasonFor(alert)).toBe('ack');
  });

  it('internal and external suppressions coexist without key collision', () => {
    const index = SuppressionIndex.of([
      createSuppressionRow({
        source: 'internal',
        rule_id: 'rule-1',
        group_hash: 'hash-1',
        alert_id: 'ep-internal',
        should_suppress: true,
        last_ack_action: 'ack',
      }),
      createSuppressionRow({
        source: 'pagerduty',
        rule_id: null,
        group_hash: 'hash-1',
        alert_id: 'ep-external',
        should_suppress: false,
      }),
    ]);

    const internalAlert = createAlert({
      source: 'internal',
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      alert_id: 'ep-internal',
    });
    const externalAlert = createAlert({
      source: 'pagerduty',
      rule_id: null,
      group_hash: 'hash-1',
      alert_id: 'ep-external',
    });

    expect(index.suppressionReasonFor(internalAlert)).toBe('ack');
    expect(index.suppressionReasonFor(externalAlert)).toBeUndefined();
  });

  it('does not leak an external series suppression across spaces', () => {
    // Same vendor and group_hash in both spaces; the ack is series-scoped
    // (alert_id: null) and applies to space-a only.
    const index = SuppressionIndex.of([
      createSuppressionRow({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'space-a',
        group_hash: 'pd-incident-1',
        alert_id: null,
        should_suppress: true,
        last_ack_action: 'ack',
      }),
    ]);

    const externalAlert = (spaceId: string) =>
      createAlert({
        source: 'pagerduty',
        rule_id: null,
        space_id: spaceId,
        group_hash: 'pd-incident-1',
        alert_id: 'pd-ep-1',
      });

    expect(index.suppressionReasonFor(externalAlert('space-a'))).toBe('ack');
    expect(index.suppressionReasonFor(externalAlert('space-b'))).toBeUndefined();
  });

  it('null-source suppression row (legacy internal) still matches internal alert by rule_id', () => {
    // Simulates a pre-existing row where source was not persisted (null)
    const index = SuppressionIndex.of([
      createSuppressionRow({
        source: 'internal',
        rule_id: 'rule-1',
        group_hash: 'h1',
        alert_id: 'e1',
        should_suppress: true,
        last_ack_action: 'ack',
      }),
    ]);

    const alert = createAlert({
      source: 'internal',
      rule_id: 'rule-1',
      group_hash: 'h1',
      alert_id: 'e1',
    });
    expect(index.suppressionReasonFor(alert)).toBe('ack');
  });
});
