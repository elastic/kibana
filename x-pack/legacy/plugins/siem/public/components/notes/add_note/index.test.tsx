/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import * as React from 'react';

import { AddNote } from '.';

describe('AddNote', () => {
  const note = 'The contents of a new note';

  test('renders correctly', () => {
    const wrapper = shallow(
      <AddNote
        associateNote={jest.fn()}
        getNewNoteId={jest.fn()}
        newNote={note}
        onCancelAddNote={jest.fn()}
        updateNewNote={jest.fn()}
        updateNote={jest.fn()}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the Cancel button when onCancelAddNote is provided', () => {
    const wrapper = mount(
      <AddNote
        associateNote={jest.fn()}
        getNewNoteId={jest.fn()}
        newNote={note}
        onCancelAddNote={jest.fn()}
        updateNewNote={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="cancel"]').exists()).toEqual(true);
  });

  test('it invokes onCancelAddNote when the Cancel button is clicked', () => {
    const onCancelAddNote = jest.fn();

    const wrapper = mount(
      <AddNote
        associateNote={jest.fn()}
        getNewNoteId={jest.fn()}
        newNote={note}
        onCancelAddNote={onCancelAddNote}
        updateNewNote={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    wrapper
      .find('[data-test-subj="cancel"]')
      .first()
      .simulate('click');

    expect(onCancelAddNote).toBeCalled();
  });

  test('it does NOT invoke associateNote when the Cancel button is clicked', () => {
    const associateNote = jest.fn();

    const wrapper = mount(
      <AddNote
        associateNote={associateNote}
        getNewNoteId={jest.fn()}
        newNote={note}
        onCancelAddNote={jest.fn()}
        updateNewNote={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    wrapper
      .find('[data-test-subj="cancel"]')
      .first()
      .simulate('click');

    expect(associateNote).not.toBeCalled();
  });

  test('it does NOT render the Cancel button when onCancelAddNote is NOT provided', () => {
    const wrapper = mount(
      <AddNote
        associateNote={jest.fn()}
        getNewNoteId={jest.fn()}
        newNote={note}
        updateNewNote={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="cancel"]').exists()).toEqual(false);
  });

  test('it renders the contents of the note', () => {
    const wrapper = mount(
      <AddNote
        associateNote={jest.fn()}
        getNewNoteId={jest.fn()}
        newNote={note}
        onCancelAddNote={jest.fn()}
        updateNewNote={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="add-a-note"]')
        .first()
        .text()
    ).toEqual(note);
  });

  test('it invokes associateNote when the Add Note button is clicked', () => {
    const associateNote = jest.fn();

    const wrapper = mount(
      <AddNote
        associateNote={associateNote}
        getNewNoteId={jest.fn()}
        newNote={note}
        onCancelAddNote={jest.fn()}
        updateNewNote={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    wrapper
      .find('[data-test-subj="add-note"]')
      .first()
      .simulate('click');

    expect(associateNote).toBeCalled();
  });

  test('it invokes getNewNoteId when the Add Note button is clicked', () => {
    const getNewNoteId = jest.fn();

    const wrapper = mount(
      <AddNote
        associateNote={jest.fn()}
        getNewNoteId={getNewNoteId}
        newNote={note}
        onCancelAddNote={jest.fn()}
        updateNewNote={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    wrapper
      .find('[data-test-subj="add-note"]')
      .first()
      .simulate('click');

    expect(getNewNoteId).toBeCalled();
  });

  test('it invokes updateNewNote when the Add Note button is clicked', () => {
    const updateNewNote = jest.fn();

    const wrapper = mount(
      <AddNote
        associateNote={jest.fn()}
        getNewNoteId={jest.fn()}
        newNote={note}
        onCancelAddNote={jest.fn()}
        updateNewNote={updateNewNote}
        updateNote={jest.fn()}
      />
    );

    wrapper
      .find('[data-test-subj="add-note"]')
      .first()
      .simulate('click');

    expect(updateNewNote).toBeCalled();
  });

  test('it invokes updateNote when the Add Note button is clicked', () => {
    const updateNote = jest.fn();

    const wrapper = mount(
      <AddNote
        associateNote={jest.fn()}
        getNewNoteId={jest.fn()}
        newNote={note}
        onCancelAddNote={jest.fn()}
        updateNewNote={jest.fn()}
        updateNote={updateNote}
      />
    );

    wrapper
      .find('[data-test-subj="add-note"]')
      .first()
      .simulate('click');

    expect(updateNote).toBeCalled();
  });

  test('it does NOT display the markdown formatting hint when a note has NOT been entered', () => {
    const wrapper = mount(
      <AddNote
        associateNote={jest.fn()}
        getNewNoteId={jest.fn()}
        newNote={''}
        onCancelAddNote={jest.fn()}
        updateNewNote={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="markdown-hint"]').first()).toHaveStyleRule(
      'visibility',
      'hidden'
    );
  });

  test('it displays the markdown formatting hint when a note has been entered', () => {
    const wrapper = mount(
      <AddNote
        associateNote={jest.fn()}
        getNewNoteId={jest.fn()}
        newNote={'We should see a formatting hint now'}
        onCancelAddNote={jest.fn()}
        updateNewNote={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="markdown-hint"]').first()).toHaveStyleRule(
      'visibility',
      'inline'
    );
  });
});
