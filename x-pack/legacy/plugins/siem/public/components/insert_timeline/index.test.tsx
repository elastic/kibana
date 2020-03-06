/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { MockedProvider } from 'react-apollo/test-utils';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { wait } from '../../lib/helpers';
import { TestProviderWithoutDragAndDrop, apolloClient } from '../../mock/test_providers';
import { mockOpenTimelineQueryResults } from '../../mock/timeline_results';
import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../pages/timelines/timelines_page';

import { StatefulInsertTimeline } from '.';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';

jest.mock('../../lib/kibana');

describe('StatefulInsertTimeline', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  const title = 'All Timelines / Open Timelines';

  test('it has the expected initial state', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulInsertTimeline
              data-test-subj="stateful-timeline"
              apolloClient={apolloClient}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      </ThemeProvider>
    );

    const componentProps = wrapper
      .find('[data-test-subj="insert-timeline"]')
      .last()
      .props();

    expect(componentProps).toEqual({
      ...componentProps,
      itemIdToExpandedNotesRowMap: {},
      onlyFavorites: false,
      pageIndex: 0,
      pageSize: 10,
      query: '',
      selectedItems: [],
      sortDirection: 'desc',
      sortField: 'updated',
    });
  });

  describe('#onQueryChange', () => {
    test('it updates the query state with the expected trimmed value when the user enters a query', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
              <StatefulInsertTimeline
                data-test-subj="stateful-timeline"
                apolloClient={apolloClient}
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );
      wrapper
        .find('[data-test-subj="search-bar"] input')
        .simulate('keyup', { keyCode: 13, target: { value: '   abcd   ' } });
      expect(
        wrapper
          .find('[data-test-subj="search-row"]')
          .first()
          .prop('query')
      ).toEqual('abcd');
    });

    test('it appends the word "with" to the Showing in Timelines message when the user enters a query', async () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
              <StatefulInsertTimeline
                apolloClient={apolloClient}
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      await wait();

      wrapper
        .find('[data-test-subj="search-bar"] input')
        .simulate('keyup', { keyCode: 13, target: { value: '   abcd   ' } });

      expect(
        wrapper
          .find('[data-test-subj="query-message"]')
          .first()
          .text()
      ).toContain('Showing: 11 timelines with');
    });

    test('echos (renders) the query when the user enters a query', async () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
              <StatefulInsertTimeline
                apolloClient={apolloClient}
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      await wait();

      wrapper
        .find('[data-test-subj="search-bar"] input')
        .simulate('keyup', { keyCode: 13, target: { value: '   abcd   ' } });

      expect(
        wrapper
          .find('[data-test-subj="selectable-query-text"]')
          .first()
          .text()
      ).toEqual('with "abcd"');
    });
  });

  describe('#focusInput', () => {
    test('focuses the input when the component mounts', async () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
              <StatefulInsertTimeline
                apolloClient={apolloClient}
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      await wait();

      expect(
        wrapper
          .find(`.${OPEN_TIMELINE_CLASS_NAME} input`)
          .first()
          .getDOMNode().id === document.activeElement!.id
      ).toBe(true);
    });
  });

  describe('#onTableChange', () => {
    test('it updates the sort state when the user clicks on a column to sort it', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
              <StatefulInsertTimeline
                data-test-subj="stateful-timeline"
                apolloClient={apolloClient}
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="insert-timeline"]')
          .last()
          .prop('sortDirection')
      ).toEqual('desc');

      wrapper
        .find('thead tr th button')
        .at(0)
        .simulate('click');

      expect(
        wrapper
          .find('[data-test-subj="insert-timeline"]')
          .last()
          .prop('sortDirection')
      ).toEqual('asc');
    });
  });

  describe('#onToggleOnlyFavorites', () => {
    test('it updates the onlyFavorites state when the user clicks the Only Favorites button', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
              <StatefulInsertTimeline
                data-test-subj="stateful-timeline"
                apolloClient={apolloClient}
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="insert-timeline"]')
          .last()
          .prop('onlyFavorites')
      ).toEqual(false);

      wrapper
        .find('[data-test-subj="only-favorites-toggle"]')
        .first()
        .simulate('click');

      expect(
        wrapper
          .find('[data-test-subj="insert-timeline"]')
          .last()
          .prop('onlyFavorites')
      ).toEqual(true);
    });
  });

  test('it renders the title', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulInsertTimeline
              data-test-subj="stateful-timeline"
              apolloClient={apolloClient}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      </ThemeProvider>
    );

    await wait();

    expect(
      wrapper
        .find('[data-test-subj="header-section-title"]')
        .first()
        .text()
    ).toEqual(title);
  });

  test('it renders the expected count of matching timelines when no query has been entered', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <TestProviderWithoutDragAndDrop>
            <StatefulInsertTimeline
              data-test-subj="stateful-timeline"
              apolloClient={apolloClient}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            />
          </TestProviderWithoutDragAndDrop>
        </MockedProvider>
      </ThemeProvider>
    );

    await wait();

    wrapper.update();

    expect(
      wrapper
        .find('[data-test-subj="query-message"]')
        .first()
        .text()
    ).toContain('Showing: 11 timelines ');
  });

  // TODO - Have been skip because we need to re-implement the test as the component changed
  test.skip('it invokes onInsertTimeline with the expected parameters when the hyperlink is clicked', async () => {
    const onInsertTimeline = jest.fn();

    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulInsertTimeline
              data-test-subj="stateful-timeline"
              apolloClient={apolloClient}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      </ThemeProvider>
    );

    await wait();

    wrapper
      .find(
        `[data-test-subj="title-${
          mockOpenTimelineQueryResults[0].result.data!.getAllTimeline.timeline[0].savedObjectId
        }"]`
      )
      .first()
      .simulate('click');

    expect(onInsertTimeline).toHaveBeenCalledWith({
      duplicate: false,
      timelineId: mockOpenTimelineQueryResults[0].result.data!.getAllTimeline.timeline[0]
        .savedObjectId,
    });
  });

  // TODO - Have been skip because we need to re-implement the test as the component changed
  test.skip('it invokes onInsertTimeline with the expected params when the button is clicked', async () => {
    const onInsertTimeline = jest.fn();

    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulInsertTimeline
              data-test-subj="stateful-timeline"
              apolloClient={apolloClient}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      </ThemeProvider>
    );

    await wait();

    wrapper
      .find('[data-test-subj="open-duplicate"]')
      .first()
      .simulate('click');

    expect(onInsertTimeline).toBeCalledWith({ duplicate: true, timelineId: 'saved-timeline-11' });
  });
});
