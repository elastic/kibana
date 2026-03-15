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
  queries: Array<{ id: string; query: string; name?: string; schedule_id?: string }>
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

  test('maps by legacy osquery-format schedule name', () => {
    const packSOs = [makePackSO('pack-1', 'my_pack', [{ id: 'q1', query: 'SELECT 1' }])];

    const lookup = buildPackLookup(packSOs);
    expect(lookup.get('pack_my_pack_q1')).toEqual({
      packId: 'pack-1',
      packName: 'my_pack',
      queryName: 'q1',
      queryText: 'SELECT 1',
    });
  });

  test('maps by space-prefixed osquery-format key when spaceId is provided', () => {
    const packSOs = [makePackSO('pack-1', 'my_pack', [{ id: 'q1', query: 'SELECT 1' }])];

    const lookup = buildPackLookup(packSOs, 'default');
    const entry = {
      packId: 'pack-1',
      packName: 'my_pack',
      queryName: 'q1',
      queryText: 'SELECT 1',
    };

    expect(lookup.get('pack_default--my_pack_q1')).toEqual(entry);
    expect(lookup.get('pack_my_pack_q1')).toEqual(entry);
  });

  test('maps by both UUID and osquery format when schedule_id is present', () => {
    const packSOs = [
      makePackSO('pack-1', 'my_pack', [{ id: 'q1', query: 'SELECT 1', schedule_id: 'uuid-abc' }]),
    ];

    const lookup = buildPackLookup(packSOs);
    const entry = {
      packId: 'pack-1',
      packName: 'my_pack',
      queryName: 'q1',
      queryText: 'SELECT 1',
    };

    expect(lookup.get('uuid-abc')).toEqual(entry);
    expect(lookup.get('pack_my_pack_q1')).toEqual(entry);
  });

  test('uses query.name as fallback for queryName when present', () => {
    const packSOs = [
      makePackSO('pack-1', 'my_pack', [{ id: 'q1', query: 'SELECT 1', name: 'My Custom Query' }]),
    ];

    const lookup = buildPackLookup(packSOs);
    expect(lookup.get('pack_my_pack_q1')).toEqual({
      packId: 'pack-1',
      packName: 'my_pack',
      queryName: 'My Custom Query',
      queryText: 'SELECT 1',
    });
  });

  test('handles multiple packs with multiple queries', () => {
    const packSOs = [
      makePackSO('pack-1', 'pack_a', [
        { id: 'q1', query: 'SELECT 1', schedule_id: 'uuid-1' },
        { id: 'q2', query: 'SELECT 2' },
      ]),
      makePackSO('pack-2', 'pack_b', [{ id: 'q1', query: 'SELECT 3' }]),
    ];

    const lookup = buildPackLookup(packSOs);

    expect(lookup.get('uuid-1')).toEqual({
      packId: 'pack-1',
      packName: 'pack_a',
      queryName: 'q1',
      queryText: 'SELECT 1',
    });
    expect(lookup.get('pack_pack_a_q2')).toEqual({
      packId: 'pack-1',
      packName: 'pack_a',
      queryName: 'q2',
      queryText: 'SELECT 2',
    });
    expect(lookup.get('pack_pack_b_q1')).toEqual({
      packId: 'pack-2',
      packName: 'pack_b',
      queryName: 'q1',
      queryText: 'SELECT 3',
    });
  });

  test('does not register space-prefixed keys when spaceId is omitted', () => {
    const packSOs = [makePackSO('pack-1', 'my_pack', [{ id: 'q1', query: 'SELECT 1' }])];

    const lookup = buildPackLookup(packSOs);
    expect(lookup.has('pack_default--my_pack_q1')).toBe(false);
    expect(lookup.has('pack_my_pack_q1')).toBe(true);
  });

  test('returns empty map for empty input', () => {
    expect(buildPackLookup([]).size).toBe(0);
  });
});
