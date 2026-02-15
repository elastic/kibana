/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultAlertFieldRules } from './default_field_rules';

describe('getDefaultAlertFieldRules', () => {
  const rules = getDefaultAlertFieldRules();

  it('returns more than 140 field rules', () => {
    expect(rules.length).toBeGreaterThan(140);
  });

  it('returns allowed=true for standard ECS fields', () => {
    const timestampRule = rules.find((r) => r.field === '@timestamp');

    expect(timestampRule).toBeDefined();
    expect(timestampRule?.allowed).toBe(true);
    expect(timestampRule?.anonymized).toBe(false);
  });

  it('returns anonymized=true with entity class for host.name', () => {
    const hostNameRule = rules.find((r) => r.field === 'host.name');

    expect(hostNameRule).toBeDefined();
    expect(hostNameRule?.allowed).toBe(true);
    expect(hostNameRule?.anonymized).toBe(true);
    expect(hostNameRule?.entityClass).toBe('HOST_NAME');
  });

  it('returns anonymized=true with entity class for user.name', () => {
    const userNameRule = rules.find((r) => r.field === 'user.name');

    expect(userNameRule).toBeDefined();
    expect(userNameRule?.allowed).toBe(true);
    expect(userNameRule?.anonymized).toBe(true);
    expect(userNameRule?.entityClass).toBe('USER_NAME');
  });

  it('returns anonymized=true for host.ip even though it is not in DEFAULT_ALLOW', () => {
    const hostIpRule = rules.find((r) => r.field === 'host.ip');

    expect(hostIpRule).toBeDefined();
    expect(hostIpRule?.anonymized).toBe(true);
    expect(hostIpRule?.entityClass).toBe('IP');
  });

  it('returns entity class for all anonymized fields', () => {
    const anonymizedWithoutClass = rules.filter((r) => r.anonymized && !r.entityClass);

    expect(anonymizedWithoutClass).toHaveLength(0);
  });
});
