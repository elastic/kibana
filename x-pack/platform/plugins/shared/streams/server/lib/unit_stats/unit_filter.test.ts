/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONFIG_HASH_FIELD, UNIT_ID_FIELD, UNIT_STATS_STREAM } from './constants';
import { buildEarliestStartRequest, buildUnitFilter, readEarliestStartMs } from './unit_filter';

const window = { start: '2026-10-19T11:45:00.000Z', end: '2026-10-19T12:00:00.000Z' };
const hashTerm = { term: { [CONFIG_HASH_FIELD]: 'h1' } };

describe('buildUnitFilter', () => {
  it('filters on the unit id and the window, with no hash filter by default', () => {
    expect(buildUnitFilter({ unitId: 'default', window })).toEqual([
      { term: { [UNIT_ID_FIELD]: 'default' } },
      { range: { '@timestamp': { gte: window.start, lt: window.end } } },
    ]);
  });

  it('adds the hash filter when the request pins a hash', () => {
    expect(buildUnitFilter({ unitId: 'default', window, configHash: 'h1' })).toContainEqual(
      hashTerm
    );
  });
});

describe('buildEarliestStartRequest', () => {
  it('searches the exact stream over all time, with no window filter', () => {
    const request = buildEarliestStartRequest({ unitId: 'default' });

    expect(request.index).toBe(UNIT_STATS_STREAM);
    expect(request.size).toBe(0);
    expect(request.query).toEqual({
      bool: { filter: [{ term: { [UNIT_ID_FIELD]: 'default' } }] },
    });
  });

  it('limits the search to the pinned hash', () => {
    const request = buildEarliestStartRequest({ unitId: 'default', configHash: 'h1' });

    expect(request.query?.bool?.filter).toContainEqual(hashTerm);
  });
});

describe('readEarliestStartMs', () => {
  it('reads the minimum as epoch ms', () => {
    expect(readEarliestStartMs({ aggregations: { earliest: { value: 1000 } } } as never)).toBe(
      1000
    );
  });

  it('is undefined when no document matched', () => {
    expect(
      readEarliestStartMs({ aggregations: { earliest: { value: null } } } as never)
    ).toBeUndefined();
    expect(readEarliestStartMs({} as never)).toBeUndefined();
  });
});
