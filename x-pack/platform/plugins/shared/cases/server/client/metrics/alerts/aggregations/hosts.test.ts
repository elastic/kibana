/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ALERTS_PER_CASE } from '../../../../../common/constants';
import { AlertHosts } from './hosts';

const topFieldsFor = (hostName: string) => ({
  hits: {
    hits: [
      {
        fields: {
          'host.name': [hostName],
        },
      },
    ],
  },
});

describe('AlertHosts', () => {
  it('builds a terms aggregation sized to the display limit by default', () => {
    const agg = new AlertHosts();

    expect(agg.build()).toMatchObject({
      hosts_frequency: {
        terms: {
          field: 'host.id',
          size: 10,
        },
      },
      hosts_total: {
        cardinality: {
          field: 'host.id',
        },
      },
    });
  });

  it('widenToExhaustive sizes the terms aggregation to capture every unique value in a case', () => {
    const agg = new AlertHosts();
    agg.widenToExhaustive();

    expect(agg.build()).toMatchObject({
      hosts_frequency: {
        terms: {
          field: 'host.id',
          size: MAX_ALERTS_PER_CASE,
        },
      },
    });
  });

  it('caps the displayed values to the display limit but keeps the true total', () => {
    const agg = new AlertHosts(1);

    const response = agg.formatResponse({
      hosts_total: { value: 2 },
      hosts_frequency: {
        buckets: [
          { key: 'id-1', doc_count: 2, top_fields: topFieldsFor('web01') },
          { key: 'id-2', doc_count: 1, top_fields: topFieldsFor('db01') },
        ],
      },
    });

    expect(response).toEqual({
      alerts: {
        hosts: {
          total: 2,
          values: [{ id: 'id-1', name: 'web01', count: 2 }],
        },
      },
    });
  });

  it('returns zero values when the aggregation is undefined', () => {
    const agg = new AlertHosts();
    // @ts-expect-error
    expect(agg.formatResponse()).toEqual({ alerts: { hosts: { total: 0, values: [] } } });
  });

  it('getAllNames returns every unique host display name, unbounded by the display limit', () => {
    const names = AlertHosts.getAllNames({
      hosts_total: { value: 2 },
      hosts_frequency: {
        buckets: [
          { key: 'id-1', doc_count: 2, top_fields: topFieldsFor('web01') },
          { key: 'id-2', doc_count: 1, top_fields: topFieldsFor('db01') },
        ],
      },
    });

    expect(names).toEqual(['web01', 'db01']);
  });

  it('getAllNames returns an empty array when the aggregation is missing', () => {
    expect(AlertHosts.getAllNames({})).toEqual([]);
  });

  it('gets the name correctly', () => {
    expect(new AlertHosts().getName()).toBe('hosts');
  });
});
