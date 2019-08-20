/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIconProps } from '@elastic/eui';
import { get } from 'lodash/fp';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import * as React from 'react';

import { DeleteTimelineModalButton } from '.';

describe('DeleteTimelineModal', () => {
  const savedObjectId = 'abcd';

  describe('showModalState', () => {
    test('it disables the delete icon if deleteTimelines is not provided', () => {
      const wrapper = mountWithIntl(
        <DeleteTimelineModalButton savedObjectId={savedObjectId} title="Privilege Escalation" />
      );

      const props = wrapper
        .find('[data-test-subj="delete-timeline"]')
        .first()
        .props() as EuiButtonIconProps;

      expect(props.isDisabled).toBe(true);
    });

    test('it disables the delete icon if savedObjectId is null', () => {
      const wrapper = mountWithIntl(
        <DeleteTimelineModalButton
          deleteTimelines={jest.fn()}
          savedObjectId={null}
          title="Privilege Escalation"
        />
      );

      const props = wrapper
        .find('[data-test-subj="delete-timeline"]')
        .first()
        .props() as EuiButtonIconProps;

      expect(props.isDisabled).toBe(true);
    });

    test('it disables the delete icon if savedObjectId is an empty string', () => {
      const wrapper = mountWithIntl(
        <DeleteTimelineModalButton
          deleteTimelines={jest.fn()}
          savedObjectId=""
          title="Privilege Escalation"
        />
      );

      const props = wrapper
        .find('[data-test-subj="delete-timeline"]')
        .first()
        .props() as EuiButtonIconProps;

      expect(props.isDisabled).toBe(true);
    });

    test('it enables the delete icon if savedObjectId is NOT an empty string', () => {
      const wrapper = mountWithIntl(
        <DeleteTimelineModalButton
          deleteTimelines={jest.fn()}
          savedObjectId="not an empty string"
          title="Privilege Escalation"
        />
      );

      const props = wrapper
        .find('[data-test-subj="delete-timeline"]')
        .first()
        .props() as EuiButtonIconProps;

      expect(props.isDisabled).toBe(false);
    });

    test('it defaults showModal to false until the trash button is clicked', () => {
      const wrapper = mountWithIntl(
        <DeleteTimelineModalButton
          deleteTimelines={jest.fn()}
          savedObjectId={savedObjectId}
          title="Privilege Escalation"
        />
      );

      expect(get('showModal', wrapper.state())).toBe(false);
    });

    test('it sets showModal to true when the trash button is clicked', () => {
      const wrapper = mountWithIntl(
        <DeleteTimelineModalButton
          deleteTimelines={jest.fn()}
          savedObjectId={savedObjectId}
          title="Privilege Escalation"
        />
      );

      wrapper
        .find('[data-test-subj="delete-timeline"]')
        .first()
        .simulate('click');

      expect(get('showModal', wrapper.state())).toBe(true);
    });

    test('it does NOT render the modal when showModal is false', () => {
      const wrapper = mountWithIntl(
        <DeleteTimelineModalButton
          deleteTimelines={jest.fn()}
          savedObjectId={savedObjectId}
          title="Privilege Escalation"
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="delete-timeline-modal"]')
          .first()
          .exists()
      ).toBe(false);
    });

    test('it renders the modal when showModal is clicked', () => {
      const wrapper = mountWithIntl(
        <DeleteTimelineModalButton
          deleteTimelines={jest.fn()}
          savedObjectId={savedObjectId}
          title="Privilege Escalation"
        />
      );

      wrapper
        .find('[data-test-subj="delete-timeline"]')
        .first()
        .simulate('click');

      expect(
        wrapper
          .find('[data-test-subj="delete-timeline-modal"]')
          .first()
          .exists()
      ).toBe(true);
    });
  });
});
