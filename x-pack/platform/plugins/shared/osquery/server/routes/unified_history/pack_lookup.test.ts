/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPackLookup } from './pack_lookup';
import type { PackSavedObject } from '../../common/types';

const makePackSO = (
  id: string,
  name: string,
  queries: Array<{
    id: string;
    query: string;
    name?: string;
    schedule_id?: string;
  }>
) =>
  ({
    id,
    attributes: { name, queries } as unknown as PackSavedObject,
  } as { id: string; attributes: PackSavedObject });

describe('buildPackLookup', () => {
  test('maps by UUID schedule_id when present', () => {
    const packSOs = [
      makePackSO('pack-1', 'my_pack', [{ id: 'q1', query: 'SELECT 1', schedule_id: 'uuid-abc' }]),
    ];

    const lookup = buildPackLookup(packSOs);

    expect(lookup.get('uuid-abc')).toEqual({
      packId: 'pack-1',
      packName: 'my_pack',
      queryName: 'q1',
      queryText: 'SELECT 1',
    });
  });

  test('maps by osquery-format schedule name: pack_<packName>_<queryId>', () => {
    const packSOs = [makePackSO('pack-1', 'my_pack', [{ id: 'q1', query: 'SELECT 1' }])];

    const lookup = buildPackLookup(packSOs);

    expect(lookup.get('pack_my_pack_q1')).toEqual({
      packId: 'pack-1',
      packName: 'my_pack',
      queryName: 'q1',
      queryText: 'SELECT 1',
    });
  });

  test('maps by both UUID and osquery-format when schedule_id is present', () => {
    const packSOs = [
      makePackSO('pack-1', 'my_pack', [{ id: 'q1', query: 'SELECT 1', schedule_id: 'uuid-123' }]),
    ];

    const lookup = buildPackLookup(packSOs);

    expect(lookup.has('uuid-123')).toBe(true);
    expect(lookup.has('pack_my_pack_q1')).toBe(true);
    // Both point to the same entry
    expect(lookup.get('uuid-123')).toEqual(lookup.get('pack_my_pack_q1'));
  });

  test('uses query.name as queryName when available, falls back to query.id', () => {
    const packSOs = [
      makePackSO('pack-1', 'my_pack', [
        { id: 'q1', query: 'SELECT 1', name: 'My Query' },
        { id: 'q2', query: 'SELECT 2' },
      ]),
    ];

    const lookup = buildPackLookup(packSOs);

    expect(lookup.get('pack_my_pack_q1')?.queryName).toBe('My Query');
    expect(lookup.get('pack_my_pack_q2')?.queryName).toBe('q2');
  });

  test('handles multiple packs with multiple queries', () => {
    const packSOs = [
      makePackSO('pack-1', 'alpha', [
        { id: 'q1', query: 'SELECT 1', schedule_id: 'uuid-a' },
        { id: 'q2', query: 'SELECT 2', schedule_id: 'uuid-b' },
      ]),
      makePackSO('pack-2', 'beta', [{ id: 'q3', query: 'SELECT 3', schedule_id: 'uuid-c' }]),
    ];

    const lookup = buildPackLookup(packSOs);

    expect(lookup.size).toBe(6); // 3 queries × 2 keys each (UUID + osquery-format)
    expect(lookup.get('uuid-a')?.packName).toBe('alpha');
    expect(lookup.get('uuid-c')?.packName).toBe('beta');
    expect(lookup.get('pack_beta_q3')?.queryText).toBe('SELECT 3');
  });

  test('skips packs with no queries', () => {
    const packSOs = [
      {
        id: 'pack-1',
        attributes: { name: 'empty_pack' } as unknown as PackSavedObject,
      },
    ];

    const lookup = buildPackLookup(packSOs);

    expect(lookup.size).toBe(0);
  });

  test('returns empty map for empty input', () => {
    const lookup = buildPackLookup([]);
    expect(lookup.size).toBe(0);
  });
});
