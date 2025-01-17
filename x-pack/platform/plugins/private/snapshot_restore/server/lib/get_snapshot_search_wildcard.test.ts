/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSnapshotSearchWildcard } from './get_snapshot_search_wildcard';

describe('getSnapshotSearchWildcard', () => {
  it('exact match search converts to a wildcard without *', () => {
    const searchParams = {
      field: 'snapshot',
      value: 'testSearch',
      operator: 'exact',
      match: 'must',
    };
    const wildcard = getSnapshotSearchWildcard(searchParams);
    expect(wildcard).toEqual('testSearch');
  });

  it('partial match search converts to a wildcard with *', () => {
    const searchParams = { field: 'snapshot', value: 'testSearch', operator: 'eq', match: 'must' };
    const wildcard = getSnapshotSearchWildcard(searchParams);
    expect(wildcard).toEqual('*testSearch*');
  });

  it('excluding search converts to "all, except" wildcard (exact match)', () => {
    const searchParams = {
      field: 'snapshot',
      value: 'testSearch',
      operator: 'exact',
      match: 'must_not',
    };
    const wildcard = getSnapshotSearchWildcard(searchParams);
    expect(wildcard).toEqual('*,-testSearch');
  });

  it('excluding search converts to "all, except" wildcard (partial match)', () => {
    const searchParams = {
      field: 'snapshot',
      value: 'testSearch',
      operator: 'eq',
      match: 'must_not',
    };
    const wildcard = getSnapshotSearchWildcard(searchParams);
    expect(wildcard).toEqual('*,-*testSearch*');
  });

  it('excluding search for policy name converts to "all,_none, except" wildcard', () => {
    const searchParams = {
      field: 'policyName',
      value: 'testSearch',
      operator: 'exact',
      match: 'must_not',
    };
    const wildcard = getSnapshotSearchWildcard(searchParams);
    expect(wildcard).toEqual('*,_none,-testSearch');
  });
});
