/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { NoteCreated } from './note_created';

describe('NoteCreated', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  moment.locale('en');
  const date = moment('2019-02-19 06:21:00');

  test('it renders a humanized date when the note was created', () => {
    const wrapper = mountWithIntl(<NoteCreated created={date.toDate()} />);

    expect(
      wrapper
        .find('[data-test-subj="note-created"]')
        .first()
        .exists()
    ).toEqual(true);
  });
});
