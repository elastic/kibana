/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suppressionAlertKey, suppressionSeriesKey } from './suppression_key';

describe('suppressionAlertKey', () => {
  it('returns rule_id-prefixed key for internal episodes', () => {
    expect(
      suppressionAlertKey({
        source: 'internal',
        rule_id: 'rule-1',
        group_hash: 'h',
        alert_id: 'e',
      })
    ).toBe('rule-1:h:e');
  });

  it('returns space-scoped source-prefixed key for external episodes', () => {
    expect(
      suppressionAlertKey({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'default',
        group_hash: 'h',
        alert_id: 'e',
      })
    ).toBe('default::pagerduty:h:e');
  });

  it('keys the same vendor episode differently per space', () => {
    const base = { source: 'pagerduty', rule_id: null, group_hash: 'h', alert_id: 'e' };

    expect(suppressionAlertKey({ ...base, space_id: 'space-a' })).not.toBe(
      suppressionAlertKey({ ...base, space_id: 'space-b' })
    );
  });

  it('treats null source as internal (uses rule_id)', () => {
    expect(
      suppressionAlertKey({ source: null, rule_id: 'rule-1', group_hash: 'h', alert_id: 'e' })
    ).toBe('rule-1:h:e');
  });

  it('treats undefined source as internal (uses rule_id)', () => {
    expect(
      suppressionAlertKey({
        source: undefined,
        rule_id: 'rule-1',
        group_hash: 'h',
        alert_id: 'e',
      })
    ).toBe('rule-1:h:e');
  });
});

describe('suppressionSeriesKey', () => {
  it('returns space-scoped source-prefixed wildcard key for external series', () => {
    expect(
      suppressionSeriesKey({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'default',
        group_hash: 'h',
      })
    ).toBe('default::pagerduty:h:*');
  });

  it('returns rule_id-prefixed wildcard key for internal series', () => {
    expect(suppressionSeriesKey({ source: 'internal', rule_id: 'rule-1', group_hash: 'h' })).toBe(
      'rule-1:h:*'
    );
  });

  it('treats null source as internal (uses rule_id)', () => {
    expect(suppressionSeriesKey({ source: null, rule_id: 'rule-1', group_hash: 'h' })).toBe(
      'rule-1:h:*'
    );
  });
});
