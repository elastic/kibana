/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_RESULTS_PER_SECTION } from './constants';
import { getSearchOptions } from './get_search_options';
import type { RuleCreateSearchItem, RuleCreateSearchSectionResult } from './types';

const createItem = (id: string): RuleCreateSearchItem => ({
  id,
  title: `Item ${id}`,
  onSelect: jest.fn(),
});

const createSection = (
  ids: readonly string[],
  overrides: Partial<RuleCreateSearchSectionResult> = {}
): RuleCreateSearchSectionResult => ({
  items: ids.map(createItem),
  isLoading: false,
  ...overrides,
});

const getKeys = (sections: Parameters<typeof getSearchOptions>[0]) =>
  getSearchOptions(sections).map(({ key }) => key);

describe('getSearchOptions', () => {
  it('returns sections in the fixed order regardless of the input order', () => {
    expect(
      getKeys({
        classic: createSection(['c1']),
        'universal.templates': createSection(['t1']),
        universal: createSection(['u1']),
      })
    ).toEqual([
      'group:universal',
      'item:universal:u1',
      'group:universal.templates',
      'item:universal.templates:t1',
      'group:classic',
      'item:classic:c1',
    ]);
  });

  it('caps each section at the max number of results', () => {
    const ids = Array.from({ length: MAX_RESULTS_PER_SECTION + 5 }, (_, index) => `i${index}`);

    const options = getSearchOptions({ universal: createSection(ids) });

    expect(options.filter(({ isGroupLabel }) => !isGroupLabel)).toHaveLength(
      MAX_RESULTS_PER_SECTION
    );
  });

  it('hides missing, failing and empty sections', () => {
    expect(
      getKeys({
        universal: createSection([]),
        'universal.templates': createSection(['t1'], { error: new Error('boom') }),
        classic: createSection(['c1']),
      })
    ).toEqual(['group:classic', 'item:classic:c1']);
  });

  it('shows a loading section without items as a loading group label', () => {
    const [groupLabel, ...rest] = getSearchOptions({
      classic: createSection([], { isLoading: true }),
    });

    expect(groupLabel).toMatchObject({
      key: 'group:classic',
      isGroupLabel: true,
      data: { isLoading: true },
    });
    expect(rest).toHaveLength(0);
  });

  it('keeps showing the items of a section that is still loading', () => {
    const [groupLabel, ...items] = getSearchOptions({
      classic: createSection(['c1'], { isLoading: true }),
    });

    expect(groupLabel.data.isLoading).toBe(false);
    expect(items.map(({ key }) => key)).toEqual(['item:classic:c1']);
  });

  it('passes the section title, header action and item to the options', () => {
    const headerAction = { label: 'Browse all', onClick: jest.fn() };
    const section = createSection(['c1'], { headerAction });

    const [groupLabel, item] = getSearchOptions({ classic: section });

    expect(groupLabel).toMatchObject({ label: 'Classic rule types', data: { headerAction } });
    expect(item).toMatchObject({
      label: 'Item c1',
      data: { sectionId: 'classic', item: section.items[0] },
    });
  });
});
