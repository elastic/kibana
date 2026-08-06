/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ALERTS_PER_CASE } from '../../../../../common/constants';
import { AlertUsers } from './users';

describe('AlertUsers', () => {
  it('builds a terms aggregation sized to the display limit by default', () => {
    const agg = new AlertUsers();

    expect(agg.build()).toEqual({
      users_frequency: {
        terms: {
          field: 'user.name',
          size: 10,
        },
      },
      users_total: {
        cardinality: {
          field: 'user.name',
        },
      },
    });
  });

  it('widenToExhaustive sizes the terms aggregation to capture every unique value in a case', () => {
    const agg = new AlertUsers();
    agg.widenToExhaustive();

    expect(agg.build()).toMatchObject({
      users_frequency: {
        terms: {
          field: 'user.name',
          size: MAX_ALERTS_PER_CASE,
        },
      },
    });
  });

  it('caps the displayed values to the display limit but keeps the true total', () => {
    const agg = new AlertUsers(2);

    const response = agg.formatResponse({
      users_total: { value: 3 },
      users_frequency: {
        buckets: [
          { key: 'alice', doc_count: 3 },
          { key: 'bob', doc_count: 2 },
          { key: 'carol', doc_count: 1 },
        ],
      },
    });

    expect(response).toEqual({
      alerts: {
        users: {
          total: 3,
          values: [
            { name: 'alice', count: 3 },
            { name: 'bob', count: 2 },
          ],
        },
      },
    });
  });

  it('returns zero values when the aggregation is undefined', () => {
    const agg = new AlertUsers();
    // @ts-expect-error
    expect(agg.formatResponse()).toEqual({ alerts: { users: { total: 0, values: [] } } });
  });

  it('getAllNames returns every unique bucket key, unbounded by the display limit', () => {
    const names = AlertUsers.getAllNames({
      users_total: { value: 3 },
      users_frequency: {
        buckets: [
          { key: 'alice', doc_count: 3 },
          { key: 'bob', doc_count: 2 },
          { key: 'carol', doc_count: 1 },
        ],
      },
    });

    expect(names).toEqual(['alice', 'bob', 'carol']);
  });

  it('getAllNames returns an empty array when the aggregation is missing', () => {
    expect(AlertUsers.getAllNames({})).toEqual([]);
  });

  it('gets the name correctly', () => {
    expect(new AlertUsers().getName()).toBe('users');
  });
});
