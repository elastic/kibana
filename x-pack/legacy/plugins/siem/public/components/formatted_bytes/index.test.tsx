/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { mockFrameworks, TestProviders } from '../../mock';

import { PreferenceFormattedBytes } from '.';

describe('formatted_bytes', () => {
  describe('PreferenceFormattedBytes', () => {
    describe('rendering', () => {
      const bytes = '2806422';

      test('renders correctly against snapshot', () => {
        const wrapper = shallow(<PreferenceFormattedBytes value={bytes} />);
        expect(toJson(wrapper)).toMatchSnapshot();
      });

      test('it renders bytes to hardcoded format when no configuration exists', () => {
        const wrapper = mount(
          <TestProviders mockFramework={{}}>
            <PreferenceFormattedBytes value={bytes} />
          </TestProviders>
        );
        expect(wrapper.text()).toEqual('2.676MB');
      });

      test('it renders bytes according to the default format', () => {
        const wrapper = mount(
          <TestProviders mockFramework={mockFrameworks.default_browser}>
            <PreferenceFormattedBytes value={bytes} />
          </TestProviders>
        );
        expect(wrapper.text()).toEqual('2.676MB');
      });

      test('it renders bytes supplied as a number according to the default format', () => {
        const wrapper = mount(
          <TestProviders mockFramework={mockFrameworks.default_browser}>
            <PreferenceFormattedBytes value={+bytes} />
          </TestProviders>
        );
        expect(wrapper.text()).toEqual('2.676MB');
      });

      test('it renders bytes according to new format', () => {
        const wrapper = mount(
          <TestProviders mockFramework={mockFrameworks.bytes_short}>
            <PreferenceFormattedBytes value={bytes} />
          </TestProviders>
        );
        expect(wrapper.text()).toEqual('3MB');
      });
    });
  });
});
