/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveEffectivePolicy } from './resolve_effective_policy';
import type { FieldRule } from './types';

describe('resolveEffectivePolicy', () => {
  const allowRule: FieldRule = {
    field: 'host.name',
    allowed: true,
    anonymized: false,
  };

  const anonymizeRule: FieldRule = {
    field: 'host.name',
    allowed: true,
    anonymized: true,
    entityClass: 'HOST_NAME',
  };

  const denyRule: FieldRule = {
    field: 'host.name',
    allowed: false,
    anonymized: false,
  };

  it('returns allow for a single allow rule', () => {
    const result = resolveEffectivePolicy([allowRule]);

    expect(result['host.name']).toEqual({ action: 'allow' });
  });

  it('returns anonymize for a single anonymize rule', () => {
    const result = resolveEffectivePolicy([anonymizeRule]);

    expect(result['host.name']).toEqual({ action: 'anonymize', entityClass: 'HOST_NAME' });
  });

  it('returns deny for a single deny rule', () => {
    const result = resolveEffectivePolicy([denyRule]);

    expect(result['host.name']).toEqual({ action: 'deny' });
  });

  it('returns deny when deny conflicts with allow', () => {
    const result = resolveEffectivePolicy([allowRule], [denyRule]);

    expect(result['host.name']).toEqual({ action: 'deny' });
  });

  it('returns deny when deny conflicts with anonymize', () => {
    const result = resolveEffectivePolicy([anonymizeRule], [denyRule]);

    expect(result['host.name']).toEqual({ action: 'deny' });
  });

  it('returns anonymize when anonymize conflicts with allow', () => {
    const result = resolveEffectivePolicy([allowRule], [anonymizeRule]);

    expect(result['host.name']).toEqual({ action: 'anonymize', entityClass: 'HOST_NAME' });
  });

  it('returns deny when all three conflict', () => {
    const result = resolveEffectivePolicy([allowRule], [anonymizeRule], [denyRule]);

    expect(result['host.name']).toEqual({ action: 'deny' });
  });

  it('resolves multiple fields independently', () => {
    const rules: FieldRule[] = [
      { field: 'host.name', allowed: true, anonymized: true, entityClass: 'HOST_NAME' },
      { field: 'user.name', allowed: false, anonymized: false },
      { field: '@timestamp', allowed: true, anonymized: false },
    ];

    const result = resolveEffectivePolicy(rules);

    expect(result['host.name']).toEqual({ action: 'anonymize', entityClass: 'HOST_NAME' });
    expect(result['user.name']).toEqual({ action: 'deny' });
    expect(result['@timestamp']).toEqual({ action: 'allow' });
  });

  it('returns empty policy for empty input', () => {
    const result = resolveEffectivePolicy([]);

    expect(result).toEqual({});
  });

  it('returns empty policy when called with no arguments', () => {
    const result = resolveEffectivePolicy();

    expect(result).toEqual({});
  });

  it('handles the order of profile sets correctly (deny in first, allow in second)', () => {
    const result = resolveEffectivePolicy([denyRule], [allowRule]);

    expect(result['host.name']).toEqual({ action: 'deny' });
  });
});
