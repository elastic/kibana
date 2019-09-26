/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { TestProviders } from '../../mock';

import { ArrowBody, ArrowHead } from '.';

describe('arrows', () => {
  describe('ArrowBody', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <ArrowBody height={3} />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('ArrowHead', () => {
    test('it renders an arrow head icon', () => {
      const wrapper = mount(
        <TestProviders>
          <ArrowHead direction={'arrowLeft'} />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="arrow-icon"]')
          .first()
          .exists()
      ).toBe(true);
    });
  });
});
