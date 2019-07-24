/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from 'test_utils/enzyme_helpers';
import * as React from 'react';

import { DeleteTimelineModal } from './delete_timeline_modal';

import * as i18n from '../translations';

describe('DeleteTimelineModal', () => {
  test('it renders the expected title when a title is specified', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={jest.fn()}
        toggleShowModal={jest.fn()}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="title"]')
        .first()
        .text()
    ).toEqual('Delete `Privilege Escalation`?');
  });

  test('it trims leading and trailing whitespace around the title', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="    Leading and trailing whitespace    "
        onDelete={jest.fn()}
        toggleShowModal={jest.fn()}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="title"]')
        .first()
        .text()
    ).toEqual('Delete `Leading and trailing whitespace`?');
  });

  test('it displays `Untitled Timeline` in the title when title is undefined', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal onDelete={jest.fn()} toggleShowModal={jest.fn()} />
    );

    expect(
      wrapper
        .find('[data-test-subj="title"]')
        .first()
        .text()
    ).toEqual('Delete `Untitled Timeline`?');
  });

  test('it displays `Untitled Timeline` in the title when title is null', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal onDelete={jest.fn()} title={null} toggleShowModal={jest.fn()} />
    );

    expect(
      wrapper
        .find('[data-test-subj="title"]')
        .first()
        .text()
    ).toEqual('Delete `Untitled Timeline`?');
  });

  test('it displays `Untitled Timeline` in the title when title is just whitespace', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal onDelete={jest.fn()} title={'    '} toggleShowModal={jest.fn()} />
    );

    expect(
      wrapper
        .find('[data-test-subj="title"]')
        .first()
        .text()
    ).toEqual('Delete `Untitled Timeline`?');
  });

  test('it renders a deletion warning', () => {
    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={jest.fn()}
        toggleShowModal={jest.fn()}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="warning"]')
        .first()
        .text()
    ).toEqual(i18n.DELETE_WARNING);
  });

  test('it invokes toggleShowModal when the Cancel button is clicked', () => {
    const toggleShowModal = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={jest.fn()}
        toggleShowModal={toggleShowModal}
      />
    );

    wrapper
      .find('[data-test-subj="confirmModalCancelButton"]')
      .first()
      .simulate('click');

    expect(toggleShowModal).toBeCalled();
  });

  test('it invokes onDelete when the Delete button is clicked', () => {
    const onDelete = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteTimelineModal
        title="Privilege Escalation"
        onDelete={onDelete}
        toggleShowModal={jest.fn()}
      />
    );

    wrapper
      .find('[data-test-subj="confirmModalConfirmButton"]')
      .first()
      .simulate('click');

    expect(onDelete).toBeCalled();
  });
});
