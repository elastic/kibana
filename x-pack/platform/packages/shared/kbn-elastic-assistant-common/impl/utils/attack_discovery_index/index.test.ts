/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAttackDiscoveryIndex, toReadableAttackIndexPattern } from '.';

describe('toReadableAttackIndexPattern', () => {
  it.each([
    ['.internal.alerts-security.attack.discovery.alerts-default-000001'],
    ['.alerts-security.attack.discovery.alerts-default'],
  ])('maps the scheduled index %s to the scheduled alias pattern', (index) => {
    expect(toReadableAttackIndexPattern(index)).toBe('.alerts-security.attack.discovery.alerts-*');
  });

  it.each([
    ['.internal.adhoc.alerts-security.attack.discovery.alerts-default-000001'],
    ['.adhoc.alerts-security.attack.discovery.alerts-default'],
  ])('maps the adhoc index %s to the adhoc alias pattern', (index) => {
    expect(toReadableAttackIndexPattern(index)).toBe(
      '.adhoc.alerts-security.attack.discovery.alerts-*'
    );
  });

  it('passes through an index that belongs to neither attack-discovery family', () => {
    expect(toReadableAttackIndexPattern('.alerts-security.alerts-default')).toBe(
      '.alerts-security.alerts-default'
    );
  });
});

describe('isAttackDiscoveryIndex', () => {
  it.each([
    ['.internal.alerts-security.attack.discovery.alerts-default-000001'],
    ['.alerts-security.attack.discovery.alerts-default'],
    ['.alerts-security.attack.discovery.alerts-*'],
    ['.internal.adhoc.alerts-security.attack.discovery.alerts-default-000001'],
    ['.adhoc.alerts-security.attack.discovery.alerts-default'],
  ])('accepts the attack discovery index %s', (index) => {
    expect(isAttackDiscoveryIndex(index)).toBe(true);
  });

  it.each([
    ['.alerts-security.alerts-default'],
    ['.internal.alerts-security.alerts-default-000001'],
    ['.kibana'],
    ['logs-*'],
    [''],
  ])('rejects the index %s', (index) => {
    expect(isAttackDiscoveryIndex(index)).toBe(false);
  });
});
