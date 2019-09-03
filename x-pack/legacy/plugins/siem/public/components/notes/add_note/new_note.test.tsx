/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import * as i18n from '../translations';

import { NewNote } from './new_note';

describe('NewNote', () => {
  const note = 'The contents of a new note';

  test('renders correctly', () => {
    const wrapper = shallow(
      <NewNote noteInputHeight={200} note={note} updateNewNote={jest.fn()} />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders a tab labeled "Note"', () => {
    const wrapper = mount(<NewNote noteInputHeight={200} note={note} updateNewNote={jest.fn()} />);

    expect(
      wrapper
        .find('button[role="tab"]')
        .first()
        .text()
    ).toEqual(i18n.NOTE);
  });

  test('it renders a tab labeled "Preview (Markdown)"', () => {
    const wrapper = mount(<NewNote noteInputHeight={200} note={note} updateNewNote={jest.fn()} />);

    expect(
      wrapper
        .find('button[role="tab"]')
        .at(1)
        .text()
    ).toEqual(i18n.PREVIEW_MARKDOWN);
  });

  test('it renders the expected placeholder when a note is NOT provided', () => {
    const wrapper = mount(<NewNote noteInputHeight={200} note={''} updateNewNote={jest.fn()} />);

    expect(wrapper.find(`textarea[placeholder="${i18n.ADD_A_NOTE}"]`).exists()).toEqual(true);
  });

  test('it renders a text area containing the contents of a new (raw) note', () => {
    const wrapper = mount(<NewNote noteInputHeight={200} note={note} updateNewNote={jest.fn()} />);

    expect(
      wrapper
        .find('[data-test-subj="add-a-note"]')
        .first()
        .text()
    ).toEqual(note);
  });

  test('it renders a markdown preview when the user clicks Preview (Markdown)', () => {
    const wrapper = mount(<NewNote noteInputHeight={200} note={note} updateNewNote={jest.fn()} />);

    // click the preview tab:
    wrapper
      .find('button[role="tab"]')
      .at(1)
      .simulate('click');

    expect(
      wrapper
        .find('[data-test-subj="markdown-root"]')
        .first()
        .text()
    ).toEqual(note);
  });
});
