/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { ModalInspectQuery } from './modal';

describe('Modal Inspect', () => {
  const closeModal = jest.fn();
  describe('rendering', () => {
    test('when isShowing is positive and request and response are not null', () => {
      const wrapper = mount(
        <ModalInspectQuery
          closeModal={closeModal}
          isShowing={true}
          request="My request"
          response="My response"
          title="My title"
        />
      );
      expect(
        wrapper
          .find('[data-test-subj="modal-inspect-euiModal"]')
          .first()
          .exists()
      ).toBe(true);
      expect(
        wrapper
          .find('.euiModalHeader__title')
          .first()
          .text()
      ).toBe('Inspect My title');
    });

    test('when isShowing is negative and request and response are not null', () => {
      const wrapper = mount(
        <ModalInspectQuery
          closeModal={closeModal}
          isShowing={false}
          request="My request"
          response="My response"
          title="My title"
        />
      );
      expect(
        wrapper
          .find('[data-test-subj="modal-inspect-euiModal"]')
          .first()
          .exists()
      ).toBe(false);
    });

    test('when isShowing is positive and request is null and response is not null', () => {
      const wrapper = mount(
        <ModalInspectQuery
          closeModal={closeModal}
          isShowing={true}
          request={null}
          response="My response"
          title="My title"
        />
      );
      expect(
        wrapper
          .find('[data-test-subj="modal-inspect-euiModal"]')
          .first()
          .exists()
      ).toBe(false);
    });

    test('when isShowing is positive and request is not null and response is null', () => {
      const wrapper = mount(
        <ModalInspectQuery
          closeModal={closeModal}
          isShowing={true}
          request="My request"
          response={null}
          title="My title"
        />
      );
      expect(
        wrapper
          .find('[data-test-subj="modal-inspect-euiModal"]')
          .first()
          .exists()
      ).toBe(false);
    });
  });

  describe('functionality from tab request/response', () => {
    test('Click on request Tab', () => {
      const wrapper = mount(
        <ModalInspectQuery
          closeModal={closeModal}
          isShowing={true}
          request="My request"
          response="My response"
          title="My title"
        />
      );

      wrapper
        .find('.euiTab')
        .first()
        .simulate('click');
      wrapper.update();

      expect(
        wrapper
          .find('.euiCodeBlock')
          .first()
          .text()
      ).toBe('My request');
    });

    test('Click on response Tab', () => {
      const wrapper = mount(
        <ModalInspectQuery
          closeModal={closeModal}
          isShowing={true}
          request="My request"
          response="My response"
          title="My title"
        />
      );

      wrapper
        .find('.euiTab')
        .at(1)
        .simulate('click');
      wrapper.update();

      expect(
        wrapper
          .find('.euiCodeBlock')
          .first()
          .text()
      ).toBe('My response');
    });
  });

  describe('events', () => {
    test('Make sure that toggle function has been called when you click on the close button', () => {
      const wrapper = mount(
        <ModalInspectQuery
          closeModal={closeModal}
          isShowing={true}
          request="My request"
          response="my response"
          title="My title"
        />
      );

      wrapper.find('button[data-test-subj="modal-inspect-close"]').simulate('click');
      wrapper.update();
      expect(closeModal).toHaveBeenCalled();
    });
  });
});
