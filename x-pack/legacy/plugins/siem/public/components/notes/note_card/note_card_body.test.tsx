/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import * as React from 'react';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';

import { NoteCardBody } from './note_card_body';

describe('NoteCardBody', () => {
  const markdownHeaderPrefix = '# '; // translates to an h1 in markdown
  const noteText = 'This is a note';
  const rawNote = `${markdownHeaderPrefix} ${noteText}`;
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <ThemeProvider theme={theme}>
        <NoteCardBody rawNote={rawNote} />
      </ThemeProvider>
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the text of the note in an h1', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <NoteCardBody rawNote={rawNote} />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find('h1')
        .first()
        .text()
    ).toEqual(noteText);
  });
});
