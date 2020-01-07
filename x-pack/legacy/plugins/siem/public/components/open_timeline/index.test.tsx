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

import { StatefulOpenTimeline } from '.';
import { NotePreviews } from './note_previews';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';

jest.mock('../../lib/kibana');

describe('StatefulOpenTimeline', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  const title = 'All Timelines / Open Timelines';

  test('it has the expected initial state', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviderWithoutDragAndDrop>
          <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              data-test-subj="stateful-timeline"
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              isModal={false}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      </ThemeProvider>
    );

    const componentProps = wrapper
      .find('[data-test-subj="open-timeline"]')
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
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                data-test-subj="stateful-timeline"
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
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
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
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
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
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
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
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

  describe('#onAddTimelinesToFavorites', () => {
    // This functionality is hiding for now and waiting to see the light in the near future
    test.skip('it invokes addTimelinesToFavorites with the selected timelines when the button is clicked', async () => {
      const addTimelinesToFavorites = jest.fn();

      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      await wait();

      wrapper
        .find('.euiCheckbox__input')
        .first()
        .simulate('change', { target: { checked: true } });

      wrapper
        .find('[data-test-subj="favorite-selected"]')
        .first()
        .simulate('click');

      expect(addTimelinesToFavorites).toHaveBeenCalledWith([
        'saved-timeline-11',
        'saved-timeline-10',
        'saved-timeline-9',
        'saved-timeline-8',
        'saved-timeline-6',
        'saved-timeline-5',
        'saved-timeline-4',
        'saved-timeline-3',
        'saved-timeline-2',
      ]);
    });
  });

  describe('#onDeleteSelected', () => {
    // TODO - Have been skip because we need to re-implement the test as the component changed
    test.skip('it invokes deleteTimelines with the selected timelines when the button is clicked', async () => {
      const deleteTimelines = jest.fn();

      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      await wait();

      wrapper
        .find('.euiCheckbox__input')
        .first()
        .simulate('change', { target: { checked: true } });

      wrapper
        .find('[data-test-subj="delete-selected"]')
        .first()
        .simulate('click');

      expect(deleteTimelines).toHaveBeenCalledWith([
        'saved-timeline-11',
        'saved-timeline-10',
        'saved-timeline-9',
        'saved-timeline-8',
        'saved-timeline-6',
        'saved-timeline-5',
        'saved-timeline-4',
        'saved-timeline-3',
        'saved-timeline-2',
      ]);
    });
  });

  describe('#onSelectionChange', () => {
    test('it updates the selection state when timelines are selected', async () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                data-test-subj="stateful-timeline"
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      await wait();

      wrapper
        .find('.euiCheckbox__input')
        .first()
        .simulate('change', { target: { checked: true } });

      const selectedItems: [] = wrapper
        .find('[data-test-subj="open-timeline"]')
        .last()
        .prop('selectedItems');

      expect(selectedItems.length).toEqual(13); // 13 because we did mock 13 timelines in the query
    });
  });

  describe('#onTableChange', () => {
    test('it updates the sort state when the user clicks on a column to sort it', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                data-test-subj="stateful-timeline"
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="open-timeline"]')
          .last()
          .prop('sortDirection')
      ).toEqual('desc');

      wrapper
        .find('thead tr th button')
        .at(0)
        .simulate('click');

      expect(
        wrapper
          .find('[data-test-subj="open-timeline"]')
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
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                data-test-subj="stateful-timeline"
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="open-timeline"]')
          .last()
          .prop('onlyFavorites')
      ).toEqual(false);

      wrapper
        .find('[data-test-subj="only-favorites-toggle"]')
        .first()
        .simulate('click');

      expect(
        wrapper
          .find('[data-test-subj="open-timeline"]')
          .last()
          .prop('onlyFavorites')
      ).toEqual(true);
    });
  });

  describe('#onToggleShowNotes', () => {
    test('it updates the itemIdToExpandedNotesRowMap state when the user clicks the expand notes button', async () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                data-test-subj="stateful-timeline"
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      await wait();
      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="open-timeline"]')
          .last()
          .prop('itemIdToExpandedNotesRowMap')
      ).toEqual({});

      wrapper
        .find('[data-test-subj="expand-notes"]')
        .first()
        .simulate('click');

      expect(
        wrapper
          .find('[data-test-subj="open-timeline"]')
          .last()
          .prop('itemIdToExpandedNotesRowMap')
      ).toEqual({
        '10849df0-7b44-11e9-a608-ab3d811609': (
          <NotePreviews
            notes={
              mockOpenTimelineQueryResults[0].result.data!.getAllTimeline.timeline[0].notes != null
                ? mockOpenTimelineQueryResults[0].result.data!.getAllTimeline.timeline[0].notes.map(
                    note => ({ ...note, savedObjectId: note.noteId })
                  )
                : []
            }
          />
        ),
      });
    });

    test('it renders the expanded notes when the expand button is clicked', async () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                data-test-subj="stateful-timeline"
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );

      await wait();

      wrapper.update();

      wrapper
        .find('[data-test-subj="expand-notes"]')
        .first()
        .simulate('click');

      expect(
        wrapper
          .find('[data-test-subj="note-previews-container"]')
          .find('[data-test-subj="updated-by"]')
          .first()
          .text()
      ).toEqual('elastic');
    });
  });

  test('it renders the title', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviderWithoutDragAndDrop>
          <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              data-test-subj="stateful-timeline"
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              isModal={false}
              title={title}
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

  describe('#resetSelectionState', () => {
    test('when the user deletes selected timelines, resetSelectionState is invoked to clear the selection state', async () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <TestProviderWithoutDragAndDrop>
            <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
              <StatefulOpenTimeline
                apolloClient={apolloClient}
                data-test-subj="stateful-timeline"
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                title={title}
              />
            </MockedProvider>
          </TestProviderWithoutDragAndDrop>
        </ThemeProvider>
      );
      const getSelectedItem = (): [] =>
        wrapper
          .find('[data-test-subj="open-timeline"]')
          .last()
          .prop('selectedItems');
      await wait();
      expect(getSelectedItem().length).toEqual(0);
      wrapper
        .find('.euiCheckbox__input')
        .first()
        .simulate('change', { target: { checked: true } });
      expect(getSelectedItem().length).toEqual(13);
      wrapper
        .find('[data-test-subj="delete-selected"]')
        .first()
        .simulate('click');
      expect(getSelectedItem().length).toEqual(0);
    });
  });

  test('it renders the expected count of matching timelines when no query has been entered', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
          <TestProviderWithoutDragAndDrop>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              data-test-subj="stateful-timeline"
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              isModal={false}
              title={title}
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
  test.skip('it invokes onOpenTimeline with the expected parameters when the hyperlink is clicked', async () => {
    const onOpenTimeline = jest.fn();

    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviderWithoutDragAndDrop>
          <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              data-test-subj="stateful-timeline"
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              isModal={false}
              title={title}
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

    expect(onOpenTimeline).toHaveBeenCalledWith({
      duplicate: false,
      timelineId: mockOpenTimelineQueryResults[0].result.data!.getAllTimeline.timeline[0]
        .savedObjectId,
    });
  });

  // TODO - Have been skip because we need to re-implement the test as the component changed
  test.skip('it invokes onOpenTimeline with the expected params when the button is clicked', async () => {
    const onOpenTimeline = jest.fn();

    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviderWithoutDragAndDrop>
          <MockedProvider addTypename={false} mocks={mockOpenTimelineQueryResults}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              data-test-subj="stateful-timeline"
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              isModal={false}
              title={title}
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

    expect(onOpenTimeline).toBeCalledWith({ duplicate: true, timelineId: 'saved-timeline-11' });
  });
});
