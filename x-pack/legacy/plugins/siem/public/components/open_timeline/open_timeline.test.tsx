/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import * as React from 'react';

import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../pages/timelines/timelines_page';
import { OpenTimelineResult } from './types';
import { TimelinesTableProps } from './timelines_table';
import { mockTimelineResults } from '../../mock/timeline_results';
import { OpenTimeline } from './open_timeline';
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD } from './constants';

describe('OpenTimeline', () => {
  const title = 'All Timelines / Open Timelines';

  let mockResults: OpenTimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  test('it renders the title row', () => {
    const wrapper = mountWithIntl(
      <OpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        isLoading={false}
        itemIdToExpandedNotesRowMap={{}}
        onAddTimelinesToFavorites={jest.fn()}
        onDeleteSelected={jest.fn()}
        onlyFavorites={false}
        onOpenTimeline={jest.fn()}
        onQueryChange={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleOnlyFavorites={jest.fn()}
        onToggleShowNotes={jest.fn()}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        query={''}
        searchResults={mockResults}
        selectedItems={[]}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        title={title}
        totalSearchResultsCount={mockResults.length}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="title-row"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the title row spacer', () => {
    const wrapper = mountWithIntl(
      <OpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        isLoading={false}
        itemIdToExpandedNotesRowMap={{}}
        onAddTimelinesToFavorites={jest.fn()}
        onDeleteSelected={jest.fn()}
        onlyFavorites={false}
        onOpenTimeline={jest.fn()}
        onQueryChange={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleOnlyFavorites={jest.fn()}
        onToggleShowNotes={jest.fn()}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        query={''}
        searchResults={mockResults}
        selectedItems={[]}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        title={title}
        totalSearchResultsCount={mockResults.length}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="title-row-spacer"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the search row', () => {
    const wrapper = mountWithIntl(
      <OpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        isLoading={false}
        itemIdToExpandedNotesRowMap={{}}
        onAddTimelinesToFavorites={jest.fn()}
        onDeleteSelected={jest.fn()}
        onlyFavorites={false}
        onOpenTimeline={jest.fn()}
        onQueryChange={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleOnlyFavorites={jest.fn()}
        onToggleShowNotes={jest.fn()}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        query={''}
        searchResults={mockResults}
        selectedItems={[]}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        title={title}
        totalSearchResultsCount={mockResults.length}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="search-row"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the search row spacer', () => {
    const wrapper = mountWithIntl(
      <OpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        isLoading={false}
        itemIdToExpandedNotesRowMap={{}}
        onAddTimelinesToFavorites={jest.fn()}
        onDeleteSelected={jest.fn()}
        onlyFavorites={false}
        onOpenTimeline={jest.fn()}
        onQueryChange={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleOnlyFavorites={jest.fn()}
        onToggleShowNotes={jest.fn()}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        query={''}
        searchResults={mockResults}
        selectedItems={[]}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        title={title}
        totalSearchResultsCount={mockResults.length}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="search-row-spacer"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the timelines table', () => {
    const wrapper = mountWithIntl(
      <OpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        isLoading={false}
        itemIdToExpandedNotesRowMap={{}}
        onAddTimelinesToFavorites={jest.fn()}
        onDeleteSelected={jest.fn()}
        onlyFavorites={false}
        onOpenTimeline={jest.fn()}
        onQueryChange={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleOnlyFavorites={jest.fn()}
        onToggleShowNotes={jest.fn()}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        query={''}
        searchResults={mockResults}
        selectedItems={[]}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        title={title}
        totalSearchResultsCount={mockResults.length}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="timelines-table"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it shows extended columns and actions when onDeleteSelected and deleteTimelines are specified', () => {
    const wrapper = mountWithIntl(
      <OpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        isLoading={false}
        itemIdToExpandedNotesRowMap={{}}
        onAddTimelinesToFavorites={jest.fn()}
        onDeleteSelected={jest.fn()}
        onlyFavorites={false}
        onOpenTimeline={jest.fn()}
        onQueryChange={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleShowNotes={jest.fn()}
        onToggleOnlyFavorites={jest.fn()}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        query={''}
        searchResults={mockResults}
        selectedItems={[]}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        title={title}
        totalSearchResultsCount={mockResults.length}
      />
    );

    const props = wrapper
      .find('[data-test-subj="timelines-table"]')
      .first()
      .props() as TimelinesTableProps;

    expect(props.showExtendedColumnsAndActions).toBe(true);
  });

  test('it does NOT show extended columns and actions when is onDeleteSelected undefined and deleteTimelines is specified', () => {
    const wrapper = mountWithIntl(
      <OpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        isLoading={false}
        itemIdToExpandedNotesRowMap={{}}
        onAddTimelinesToFavorites={jest.fn()}
        onlyFavorites={false}
        onOpenTimeline={jest.fn()}
        onQueryChange={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleShowNotes={jest.fn()}
        onToggleOnlyFavorites={jest.fn()}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        query={''}
        searchResults={mockResults}
        selectedItems={[]}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        title={title}
        totalSearchResultsCount={mockResults.length}
      />
    );

    const props = wrapper
      .find('[data-test-subj="timelines-table"]')
      .first()
      .props() as TimelinesTableProps;

    expect(props.showExtendedColumnsAndActions).toBe(false);
  });

  test('it does NOT show extended columns and actions when is onDeleteSelected provided and deleteTimelines is undefined', () => {
    const wrapper = mountWithIntl(
      <OpenTimeline
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        isLoading={false}
        itemIdToExpandedNotesRowMap={{}}
        onAddTimelinesToFavorites={jest.fn()}
        onDeleteSelected={jest.fn()}
        onlyFavorites={false}
        onOpenTimeline={jest.fn()}
        onQueryChange={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleOnlyFavorites={jest.fn()}
        onToggleShowNotes={jest.fn()}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        query={''}
        searchResults={mockResults}
        selectedItems={[]}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        title={title}
        totalSearchResultsCount={mockResults.length}
      />
    );

    const props = wrapper
      .find('[data-test-subj="timelines-table"]')
      .first()
      .props() as TimelinesTableProps;

    expect(props.showExtendedColumnsAndActions).toBe(false);
  });

  test('it does NOT show extended columns and actions when both onDeleteSelected and deleteTimelines are undefined', () => {
    const wrapper = mountWithIntl(
      <OpenTimeline
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        isLoading={false}
        itemIdToExpandedNotesRowMap={{}}
        onAddTimelinesToFavorites={jest.fn()}
        onlyFavorites={false}
        onOpenTimeline={jest.fn()}
        onQueryChange={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleOnlyFavorites={jest.fn()}
        onToggleShowNotes={jest.fn()}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        query={''}
        searchResults={mockResults}
        selectedItems={[]}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        title={title}
        totalSearchResultsCount={mockResults.length}
      />
    );

    const props = wrapper
      .find('[data-test-subj="timelines-table"]')
      .first()
      .props() as TimelinesTableProps;

    expect(props.showExtendedColumnsAndActions).toBe(false);
  });
});
