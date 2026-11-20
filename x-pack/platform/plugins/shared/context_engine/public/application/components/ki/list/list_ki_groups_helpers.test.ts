/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiGroup, KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import {
  EMPTY_TILE_SELECTION,
  OTHER_SECTION_KEY,
  buildListKiSections,
  getNextGroupSize,
  isOtherSectionShown,
  type ListKiOtherResult,
} from './list_ki_groups_helpers';

const ki = (id: string, type?: string): KiListItem => ({
  id,
  index: 'ai-index-idx-sample-ki',
  ...(type !== undefined ? { type } : {}),
  title: `Doc ${id}`,
  status: 'active',
});

const rows = (count: number, type?: string, prefix = type ?? 'none') =>
  Array.from({ length: count }, (_, position) => ki(`${prefix}-${position}`, type));

const groups: KiGroup[] = [
  { type: 'alpha', count: 30, kis: rows(10, 'alpha') },
  { type: 'beta', count: 4, kis: rows(4, 'beta') },
];

const noOther: ListKiOtherResult = { kis: [], total: undefined, isFetching: false };

describe('buildListKiSections', () => {
  it('shows every group, in API order, with the group count and its preview rows', () => {
    const sections = buildListKiSections({
      groups,
      totalOther: 3,
      groupResults: {},
      other: noOther,
      selection: EMPTY_TILE_SELECTION,
    });

    expect(sections.map(({ key, count, kis }) => [key, count, kis.length])).toEqual([
      ['type:alpha', 30, 10],
      ['type:beta', 4, 4],
    ]);
    expect(sections[0].canShowMore).toBe(true);
    expect(sections[1].canShowMore).toBe(false);
  });

  it('does not show "Other" while its tile is not selected', () => {
    const sections = buildListKiSections({
      groups,
      totalOther: 3,
      groupResults: {},
      other: noOther,
      selection: EMPTY_TILE_SELECTION,
    });
    expect(sections.some(({ kind }) => kind === 'other')).toBe(false);
  });

  it('shows only the selected sections, "Other" last', () => {
    const sections = buildListKiSections({
      groups,
      totalOther: 3,
      groupResults: {},
      other: { kis: rows(3), total: 3, isFetching: false },
      selection: { types: new Set(['beta']), other: true },
    });

    expect(sections.map(({ key }) => key)).toEqual(['type:beta', OTHER_SECTION_KEY]);
    expect(sections[1]).toMatchObject({ kind: 'other', type: '', count: 3, canShowMore: false });
  });

  it('splits "Other" by type, with "Show more" rows, and puts the rest last', () => {
    const sections = buildListKiSections({
      groups,
      totalOther: 9,
      groupResults: { gamma: { kis: rows(6, 'gamma'), isFetching: false } },
      other: {
        byType: {
          groups: [
            { type: 'gamma', count: 6, kis: rows(2, 'gamma') },
            { type: 'delta', count: 1, kis: rows(1, 'delta') },
          ],
          restCount: 2,
        },
        kis: rows(2),
        total: undefined,
        isFetching: false,
      },
      selection: { types: new Set(), other: true },
    });

    expect(sections.map(({ key, kind, count, kis }) => [key, kind, count, kis.length])).toEqual([
      ['type:gamma', 'type', 6, 6],
      ['type:delta', 'type', 1, 1],
      ['other', 'other', 2, 2],
    ]);
  });

  it('has no flat "Other" section when the "Other" groups cover all of it', () => {
    const sections = buildListKiSections({
      groups,
      totalOther: 1,
      groupResults: {},
      other: {
        byType: { groups: [{ type: 'delta', count: 1, kis: rows(1, 'delta') }], restCount: 0 },
        kis: [],
        total: undefined,
        isFetching: false,
      },
      selection: { types: new Set(), other: true },
    });

    expect(sections.map(({ key }) => key)).toEqual(['type:delta']);
  });

  it('uses the groups count for "Other" until its own request answers', () => {
    const [otherSection] = buildListKiSections({
      groups,
      totalOther: 7,
      groupResults: {},
      other: { kis: [], total: undefined, isFetching: true },
      selection: { types: new Set(), other: true },
    });
    expect(otherSection).toMatchObject({ kind: 'other', count: 7, isLoadingMore: true });
  });

  it('uses the rows loaded for a type (tile click, "Show more") over the preview', () => {
    const [alpha] = buildListKiSections({
      groups,
      totalOther: 0,
      groupResults: { alpha: { kis: rows(25, 'alpha'), isFetching: true } },
      other: noOther,
      selection: EMPTY_TILE_SELECTION,
    });
    expect(alpha.kis).toHaveLength(25);
    expect(alpha.isLoadingMore).toBe(true);
  });

  it('reports the cap when a section has the max rows and more exist', () => {
    const [alpha] = buildListKiSections({
      groups: [{ type: 'alpha', count: 150, kis: rows(10, 'alpha') }],
      totalOther: 0,
      groupResults: { alpha: { kis: rows(100, 'alpha'), isFetching: false } },
      other: noOther,
      selection: EMPTY_TILE_SELECTION,
    });
    expect(alpha).toMatchObject({ canShowMore: false, isCapReached: true });
  });

  it('shows "Other" by default when no document has a type', () => {
    const sections = buildListKiSections({
      groups: [],
      totalOther: 15,
      groupResults: {},
      other: { kis: rows(15), total: 15, isFetching: false },
      selection: EMPTY_TILE_SELECTION,
    });
    expect(sections.map(({ key }) => key)).toEqual([OTHER_SECTION_KEY]);
  });

  it('shows nothing for an empty AI index', () => {
    expect(
      buildListKiSections({
        groups: [],
        totalOther: 0,
        groupResults: {},
        other: noOther,
        selection: EMPTY_TILE_SELECTION,
      })
    ).toEqual([]);
  });
});

describe('isOtherSectionShown', () => {
  it('needs other documents', () => {
    expect(isOtherSectionShown(groups, 0, { types: new Set(), other: true })).toBe(false);
  });

  it('is strict: a type selection with no match never brings in "Other"', () => {
    expect(isOtherSectionShown([], 5, { types: new Set(['alpha']), other: false })).toBe(false);
    expect(isOtherSectionShown([], 5, EMPTY_TILE_SELECTION)).toBe(true);
  });
});

describe('section order', () => {
  it('follows the tile order, not the counts (they change while searching)', () => {
    const sections = buildListKiSections({
      groups: [
        { type: 'beta', count: 9, kis: rows(1, 'beta') },
        { type: 'alpha', count: 2, kis: rows(1, 'alpha') },
      ],
      totalOther: 0,
      groupResults: {},
      other: noOther,
      selection: EMPTY_TILE_SELECTION,
      typeOrder: ['alpha', 'beta'],
    });
    expect(sections.map(({ type }) => type)).toEqual(['alpha', 'beta']);
  });
});

describe('strict selection', () => {
  it('shows no section for a selected type without a match (empty list, not other types)', () => {
    const sections = buildListKiSections({
      groups: [{ type: 'beta', count: 2, kis: rows(2, 'beta') }],
      totalOther: 0,
      groupResults: {},
      other: noOther,
      selection: { types: new Set(['alpha']), other: false },
    });
    expect(sections).toEqual([]);
  });
});

describe('getNextGroupSize', () => {
  it('adds a page and stops at the cap', () => {
    expect(getNextGroupSize(10)).toBe(60);
    expect(getNextGroupSize(90)).toBe(100);
  });
});
