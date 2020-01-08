/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIconProps } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { cloneDeep, omit } from 'lodash/fp';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../../pages/timelines/timelines_page';
import { mockTimelineResults } from '../../../mock/timeline_results';
import { OpenTimelineResult } from '../types';
import { TimelinesTable } from '.';
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD } from '../constants';

jest.mock('../../../lib/kibana');

describe('#getActionsColumns', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  let mockResults: OpenTimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  test('it renders the delete timeline (trash icon) when showDeleteAction is true (because showExtendedColumnsAndActions is true)', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          loading={false}
          itemIdToExpandedNotesRowMap={{}}
          onOpenTimeline={jest.fn()}
          onSelectionChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleShowNotes={jest.fn()}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={mockResults}
          showExtendedColumnsAndActions={true}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="delete-timeline"]').exists()).toBe(true);
  });

  test('it does NOT render the delete timeline (trash icon) when showDeleteAction is false (because showExtendedColumnsAndActions is false)', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          loading={false}
          itemIdToExpandedNotesRowMap={{}}
          onOpenTimeline={jest.fn()}
          onSelectionChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleShowNotes={jest.fn()}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={mockResults}
          showExtendedColumnsAndActions={false}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="delete-timeline"]').exists()).toBe(false);
  });

  test('it does NOT render the delete timeline (trash icon) when deleteTimelines is not provided', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          loading={false}
          itemIdToExpandedNotesRowMap={{}}
          onOpenTimeline={jest.fn()}
          onSelectionChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleShowNotes={jest.fn()}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={mockResults}
          showExtendedColumnsAndActions={true}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="delete-timeline"]').exists()).toBe(false);
  });

  test('it renders a disabled the open duplicate button if the timeline does not have a saved object id', () => {
    const missingSavedObjectId: OpenTimelineResult[] = [
      omit('savedObjectId', { ...mockResults[0] }),
    ];

    const wrapper = mountWithIntl(
      <TimelinesTable
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        loading={false}
        itemIdToExpandedNotesRowMap={{}}
        onOpenTimeline={jest.fn()}
        onSelectionChange={jest.fn()}
        onTableChange={jest.fn()}
        onToggleShowNotes={jest.fn()}
        pageIndex={0}
        pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        searchResults={missingSavedObjectId}
        showExtendedColumnsAndActions={true}
        sortDirection={DEFAULT_SORT_DIRECTION}
        sortField={DEFAULT_SORT_FIELD}
        totalSearchResultsCount={missingSavedObjectId.length}
      />
    );

    const props = wrapper
      .find('[data-test-subj="open-duplicate"]')
      .first()
      .props() as EuiButtonIconProps;

    expect(props.isDisabled).toBe(true);
  });

  test('it renders an enabled the open duplicate button if the timeline has have a saved object id', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          loading={false}
          itemIdToExpandedNotesRowMap={{}}
          onOpenTimeline={jest.fn()}
          onSelectionChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleShowNotes={jest.fn()}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={mockResults}
          showExtendedColumnsAndActions={false}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
        />
      </ThemeProvider>
    );

    const props = wrapper
      .find('[data-test-subj="open-duplicate"]')
      .first()
      .props() as EuiButtonIconProps;

    expect(props.isDisabled).toBe(false);
  });

  test('it invokes onOpenTimeline with the expected params when the button is clicked', () => {
    const onOpenTimeline = jest.fn();

    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <TimelinesTable
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          loading={false}
          itemIdToExpandedNotesRowMap={{}}
          onOpenTimeline={onOpenTimeline}
          onSelectionChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleShowNotes={jest.fn()}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={mockResults}
          showExtendedColumnsAndActions={false}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
        />
      </ThemeProvider>
    );

    wrapper
      .find('[data-test-subj="open-duplicate"]')
      .first()
      .simulate('click');

    expect(onOpenTimeline).toBeCalledWith({ duplicate: true, timelineId: 'saved-timeline-11' });
  });
});
