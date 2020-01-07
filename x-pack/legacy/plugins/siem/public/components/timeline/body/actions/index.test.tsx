/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../mock';
import { DEFAULT_ACTIONS_COLUMN_WIDTH } from '../helpers';

import { Actions } from '.';

describe('Actions', () => {
  test('it renders a checkbox for selecting the event when `showCheckboxes` is `true`', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          eventId="abc"
          eventIsPinned={false}
          expanded={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          showCheckboxes={true}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toEqual(true);
  });

  test('it does NOT render a checkbox for selecting the event when `showCheckboxes` is `false`', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          eventId="abc"
          eventIsPinned={false}
          expanded={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toBe(false);
  });

  test('it renders a button for expanding the event', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          eventId="abc"
          eventIsPinned={false}
          expanded={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="expand-event"]').exists()).toEqual(true);
  });

  test('it invokes onEventToggled when the button to expand an event is clicked', () => {
    const onEventToggled = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          eventId="abc"
          eventIsPinned={false}
          expanded={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
          onEventToggled={onEventToggled}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
        />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="expand-event"]')
      .first()
      .simulate('click');

    expect(onEventToggled).toBeCalled();
  });

  test('it does NOT render a notes button when isEventsViewer is true', () => {
    const toggleShowNotes = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          eventId="abc"
          eventIsPinned={false}
          expanded={false}
          getNotesByIds={jest.fn()}
          isEventViewer={true}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={toggleShowNotes}
          updateNote={jest.fn()}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="timeline-notes-button-small"]').exists()).toBe(false);
  });

  test('it invokes toggleShowNotes when the button for adding notes is clicked', () => {
    const toggleShowNotes = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          eventId="abc"
          eventIsPinned={false}
          expanded={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={toggleShowNotes}
          updateNote={jest.fn()}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
        />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="timeline-notes-button-small"]')
      .first()
      .simulate('click');

    expect(toggleShowNotes).toBeCalled();
  });

  test('it does NOT render a pin button when isEventViewer is true', () => {
    const onPinClicked = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          eventId="abc"
          eventIsPinned={false}
          expanded={false}
          getNotesByIds={jest.fn()}
          isEventViewer={true}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
          onEventToggled={jest.fn()}
          onPinClicked={onPinClicked}
          onRowSelected={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="pin"]').exists()).toBe(false);
  });

  test('it invokes onPinClicked when the button for pinning events is clicked', () => {
    const onPinClicked = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          eventId="abc"
          eventIsPinned={false}
          expanded={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
          onEventToggled={jest.fn()}
          onPinClicked={onPinClicked}
          onRowSelected={jest.fn()}
        />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="pin"]')
      .first()
      .simulate('click');

    expect(onPinClicked).toHaveBeenCalled();
  });
});
