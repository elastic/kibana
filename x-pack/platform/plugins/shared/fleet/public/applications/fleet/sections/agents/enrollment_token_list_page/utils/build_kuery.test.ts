/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import { buildKuery } from './build_kuery';

describe('buildKuery', () => {
  it('should exclude expired tokens from the active filter', () => {
    expect(buildKuery('', [], 'active', [])).toEqual(
      '(active:true and not (expire_at <= "now")) and (not hidden:true)'
    );
  });

  it('should match only expired tokens for the expired filter', () => {
    expect(buildKuery('', [], 'expired', [])).toEqual(
      '(active:true and expire_at <= "now") and (not hidden:true)'
    );
  });

  it('should match only revoked tokens for the inactive filter', () => {
    expect(buildKuery('', [], 'inactive', [])).toEqual('(active:false) and (not hidden:true)');
  });

  it('should not filter on status when showing all tokens', () => {
    expect(buildKuery('', [], 'all', [])).toEqual('(not hidden:true)');
  });

  it('should combine the status filter with the other filters', () => {
    expect(buildKuery('my-token', ['policy-1'], 'expired', ['policy-2'])).toEqual(
      '(my-token) and (policy_id:"policy-1") and (active:true and expire_at <= "now") and ' +
        '(not (policy_id:"policy-2")) and (not hidden:true)'
    );
  });

  it.each(['active', 'expired', 'inactive', 'all'] as const)(
    'should produce a valid KQL expression for the %s filter',
    (activeFilter) => {
      expect(() =>
        fromKueryExpression(buildKuery('my-token', ['policy-1'], activeFilter, ['policy-2']))
      ).not.toThrow();
    }
  );

  it('should compile the active filter to a negated range so tokens without an expiration match', () => {
    const query = toElasticsearchQuery(fromKueryExpression(buildKuery('', [], 'active', [])));

    expect(JSON.stringify(query)).toContain('"must_not"');
    expect(JSON.stringify(query)).toContain('"expire_at":{"lte":"now"}');
  });
});
