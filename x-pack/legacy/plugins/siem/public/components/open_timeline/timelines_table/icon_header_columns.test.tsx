/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { cloneDeep, omit } from 'lodash/fp';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../../pages/timelines/timelines_page';
import { mockTimelineResults } from '../../../mock/timeline_results';
import { TimelinesTable } from '.';
import { OpenTimelineResult } from '../types';
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD } from '../constants';

jest.mock('../../../lib/kibana');

describe('#getActionsColumns', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  let mockResults: OpenTimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  test('it renders the pinned events header icon', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          deleteTimelines={jest.fn()}
          itemIdToExpandedNotesRowMap={{}}
          loading={false}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={mockResults}
          showExtendedColumnsAndActions={true}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
          onOpenTimeline={jest.fn()}
          onSelectionChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleShowNotes={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="pinned-event-header-icon"]').exists()).toBe(true);
  });

  test('it renders the expected pinned events count', () => {
    const with6Events = [mockResults[0]];

    const wrapper = mountWithIntl(
      <TimelinesTable
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        deleteTimelines={jest.fn()}
        itemIdToExpandedNotesRowMap={{}}
        loading={false}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        searchResults={with6Events}
        showExtendedColumnsAndActions={true}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        totalSearchResultsCount={with6Events.length}
        onOpenTimeline={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleShowNotes={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="pinned-event-count"]').text()).toEqual('6');
  });

  test('it renders the notes count header icon', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          deleteTimelines={jest.fn()}
          itemIdToExpandedNotesRowMap={{}}
          loading={false}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={mockResults}
          showExtendedColumnsAndActions={true}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
          onOpenTimeline={jest.fn()}
          onSelectionChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleShowNotes={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="notes-count-header-icon"]').exists()).toBe(true);
  });

  test('it renders the expected notes count', () => {
    const with4Notes = [mockResults[0]];

    const wrapper = mountWithIntl(
      <TimelinesTable
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        deleteTimelines={jest.fn()}
        itemIdToExpandedNotesRowMap={{}}
        loading={false}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        searchResults={with4Notes}
        showExtendedColumnsAndActions={true}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        totalSearchResultsCount={with4Notes.length}
        onOpenTimeline={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleShowNotes={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="notes-count"]').text()).toEqual('4');
  });

  test('it renders the favorites header icon', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          deleteTimelines={jest.fn()}
          itemIdToExpandedNotesRowMap={{}}
          loading={false}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={mockResults}
          showExtendedColumnsAndActions={true}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
          onOpenTimeline={jest.fn()}
          onSelectionChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleShowNotes={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="favorites-header-icon"]').exists()).toBe(true);
  });

  test('it renders an empty star when favorite is undefined', () => {
    const undefinedFavorite: OpenTimelineResult[] = [omit('favorite', { ...mockResults[0] })];

    const wrapper = mountWithIntl(
      <TimelinesTable
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        deleteTimelines={jest.fn()}
        itemIdToExpandedNotesRowMap={{}}
        loading={false}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        searchResults={undefinedFavorite}
        showExtendedColumnsAndActions={true}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        totalSearchResultsCount={undefinedFavorite.length}
        onOpenTimeline={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleShowNotes={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="favorite-starEmpty-star"]').exists()).toBe(true);
  });

  test('it renders an empty star when favorite is null', () => {
    const nullFavorite: OpenTimelineResult[] = [{ ...mockResults[0], favorite: null }];

    const wrapper = mountWithIntl(
      <TimelinesTable
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        deleteTimelines={jest.fn()}
        itemIdToExpandedNotesRowMap={{}}
        loading={false}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        searchResults={nullFavorite}
        showExtendedColumnsAndActions={true}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        totalSearchResultsCount={nullFavorite.length}
        onOpenTimeline={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleShowNotes={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="favorite-starEmpty-star"]').exists()).toBe(true);
  });

  test('it renders an empty star when favorite is empty', () => {
    const emptyFavorite: OpenTimelineResult[] = [{ ...mockResults[0], favorite: [] }];

    const wrapper = mountWithIntl(
      <TimelinesTable
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        deleteTimelines={jest.fn()}
        itemIdToExpandedNotesRowMap={{}}
        loading={false}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        searchResults={emptyFavorite}
        showExtendedColumnsAndActions={true}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        totalSearchResultsCount={emptyFavorite.length}
        onOpenTimeline={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleShowNotes={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="favorite-starEmpty-star"]').exists()).toBe(true);
  });

  test('it renders an filled star when favorite has one entry', () => {
    const emptyFavorite: OpenTimelineResult[] = [
      {
        ...mockResults[0],
        favorite: [
          {
            userName: 'alice',
            favoriteDate: 1553700753 * 10000,
          },
        ],
      },
    ];

    const wrapper = mountWithIntl(
      <TimelinesTable
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        deleteTimelines={jest.fn()}
        itemIdToExpandedNotesRowMap={{}}
        loading={false}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        searchResults={emptyFavorite}
        showExtendedColumnsAndActions={true}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        totalSearchResultsCount={emptyFavorite.length}
        onOpenTimeline={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleShowNotes={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="favorite-starFilled-star"]').exists()).toBe(true);
  });

  test('it renders an filled star when favorite has more than one entry', () => {
    const emptyFavorite: OpenTimelineResult[] = [
      {
        ...mockResults[0],
        favorite: [
          {
            userName: 'alice',
            favoriteDate: 1553700753 * 10000,
          },
          {
            userName: 'bob',
            favoriteDate: 1653700754 * 10000,
          },
        ],
      },
    ];

    const wrapper = mountWithIntl(
      <TimelinesTable
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        deleteTimelines={jest.fn()}
        itemIdToExpandedNotesRowMap={{}}
        loading={false}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        searchResults={emptyFavorite}
        showExtendedColumnsAndActions={true}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        totalSearchResultsCount={emptyFavorite.length}
        onOpenTimeline={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleShowNotes={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="favorite-starFilled-star"]').exists()).toBe(true);
  });
});
