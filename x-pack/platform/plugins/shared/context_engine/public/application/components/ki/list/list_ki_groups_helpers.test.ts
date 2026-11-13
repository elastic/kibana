/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_KI_PAGE_SIZE } from '../../../../../common/constants';
import type { KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import { ALL_TYPE_FILTER } from './list_ki_helpers';
import { buildListKiGroups, getNextGroupSize } from './list_ki_groups_helpers';

const ki = (id: string, type?: string): KiListItem => ({ id, index: 'idx', type, title: id });

const kis = [ki('a1', 'alpha'), ki('b1', 'beta'), ki('a2', 'alpha'), ki('n1'), ki('c1', 'gamma')];

describe('buildListKiGroups', () => {
  it('makes one group per counted type, in API order, with the type total', () => {
    const groups = buildListKiGroups({
      kis,
      total: 40,
      countsByType: [
        { type: 'beta', count: 30 },
        { type: 'alpha', count: 2 },
      ],
      typeFilter: ALL_TYPE_FILTER,
      groupResults: {},
    });

    expect(groups.map(({ type, count }) => [type, count])).toEqual([
      ['beta', 30],
      ['alpha', 2],
      ['gamma', 1],
    ]);
    expect(groups[0].kis.map(({ id }) => id)).toEqual(['b1']);
    expect(groups[0].canShowMore).toBe(true);
    expect(groups[1].kis.map(({ id }) => id)).toEqual(['a1', 'a2']);
    expect(groups[1].canShowMore).toBe(false);
  });

  it('leaves out documents without a type', () => {
    const groups = buildListKiGroups({
      kis,
      total: 5,
      countsByType: [],
      typeFilter: ALL_TYPE_FILTER,
      groupResults: {},
    });
    expect(groups.flatMap((group) => group.kis).map(({ id }) => id)).not.toContain('n1');
  });

  it('keeps a counted group with no loaded rows', () => {
    const groups = buildListKiGroups({
      kis: [],
      total: 3,
      countsByType: [{ type: 'delta', count: 3 }],
      typeFilter: ALL_TYPE_FILTER,
      groupResults: {},
    });
    expect(groups).toEqual([
      expect.objectContaining({ type: 'delta', kis: [], canShowMore: true }),
    ]);
  });

  it('uses the rows loaded with "Show more" for that group', () => {
    const groups = buildListKiGroups({
      kis,
      total: 40,
      countsByType: [{ type: 'beta', count: 30 }],
      typeFilter: ALL_TYPE_FILTER,
      groupResults: { beta: { kis: [ki('b1', 'beta'), ki('b2', 'beta')], isFetching: true } },
    });
    expect(groups[0].kis.map(({ id }) => id)).toEqual(['b1', 'b2']);
    expect(groups[0].isLoadingMore).toBe(true);
  });

  it('shows only the filtered type, counted by the filtered total', () => {
    const groups = buildListKiGroups({
      kis: [ki('a1', 'alpha')],
      total: 7,
      countsByType: [{ type: 'beta', count: 30 }],
      typeFilter: { kind: 'type', value: 'alpha' },
      groupResults: {},
    });
    expect(groups.map(({ type, count }) => [type, count])).toEqual([['alpha', 7]]);
  });

  it('reports the cap when a group has the max rows and more exist', () => {
    const many = Array.from({ length: MAX_KI_PAGE_SIZE }, (_, n) => ki(`b${n}`, 'beta'));
    const groups = buildListKiGroups({
      kis: [],
      total: 500,
      countsByType: [{ type: 'beta', count: 500 }],
      typeFilter: ALL_TYPE_FILTER,
      groupResults: { beta: { kis: many, isFetching: false } },
    });
    expect(groups[0].canShowMore).toBe(false);
    expect(groups[0].isCapReached).toBe(true);
  });
});

describe('getNextGroupSize', () => {
  it('adds one page and stops at the max', () => {
    expect(getNextGroupSize(3)).toBe(28);
    expect(getNextGroupSize(90)).toBe(MAX_KI_PAGE_SIZE);
  });
});
