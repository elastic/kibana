/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmlSearchFilterType } from '../../../common/http_api/sml';
import { buildTypeFilters } from './sml_service';

// buildTypeFilters is designed to combine clauses from multiple SmlSearchFilterType
// values. When the enum grows beyond 'connector', add multi-type tests here.

describe('buildTypeFilters', () => {
  it('returns undefined when filters is undefined', () => {
    expect(buildTypeFilters(undefined)).toBeUndefined();
  });

  it('returns undefined when filters is empty', () => {
    expect(buildTypeFilters({})).toBeUndefined();
  });

  it('returns undefined when type criteria has no ids', () => {
    expect(buildTypeFilters({ [SmlSearchFilterType.connector]: {} })).toBeUndefined();
  });

  it('excludes the type entirely when ids is empty', () => {
    const filter = buildTypeFilters({ [SmlSearchFilterType.connector]: { ids: [] } });
    expect(filter).toEqual({
      bool: { must_not: [{ term: { type: 'connector' } }] },
    });
  });

  it('returns a filter for a single type with ids', () => {
    const filter = buildTypeFilters({
      [SmlSearchFilterType.connector]: { ids: ['conn-1', 'conn-2'] },
    });
    expect(filter).toEqual({
      bool: {
        should: [
          {
            bool: {
              must: [
                { term: { type: 'connector' } },
                { terms: { origin_id: ['conn-1', 'conn-2'] } },
              ],
            },
          },
          {
            bool: {
              must_not: [{ term: { type: 'connector' } }],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });
});
