/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../mock';

import { ArrowBody, ArrowHead } from '.';

describe('arrows', () => {
  describe('ArrowBody', () => {
    test('renders correctly', () => {
      const wrapper = mount(<ArrowBody height={3} />, { wrappingComponent: TestProviders });
      expect(wrapper.find('ArrowBody').prop('height')).toEqual(3);
    });
  });

  describe('ArrowHead', () => {
    test('it renders an arrow head icon', () => {
      const wrapper = mount(<ArrowHead direction={'arrowLeft'} />, {
        wrappingComponent: TestProviders,
      });

      expect(
        wrapper
          .find('[data-test-subj="arrow-icon"]')
          .first()
          .exists()
      ).toBe(true);
    });
  });
});
