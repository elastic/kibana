/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { mockFrameworks, getMockKibanaUiSetting } from '../../mock';
import { useUiSetting$ } from '../../lib/kibana';

import { PreferenceFormattedBytesComponent } from '.';

jest.mock('../../lib/kibana');
const mockUseUiSetting$ = useUiSetting$ as jest.Mock;

describe('formatted_bytes', () => {
  describe('PreferenceFormattedBytes', () => {
    describe('rendering', () => {
      beforeEach(() => {
        mockUseUiSetting$.mockClear();
      });

      const bytes = '2806422';

      test('renders correctly against snapshot', () => {
        mockUseUiSetting$.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_browser)
        );
        const wrapper = shallow(<PreferenceFormattedBytesComponent value={bytes} />);
        expect(toJson(wrapper)).toMatchSnapshot();
      });

      test('it renders bytes to hardcoded format when no configuration exists', () => {
        mockUseUiSetting$.mockImplementation(() => [null]);
        const wrapper = mount(<PreferenceFormattedBytesComponent value={bytes} />);
        expect(wrapper.text()).toEqual('2.7MB');
      });

      test('it renders bytes according to the default format', () => {
        mockUseUiSetting$.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_browser)
        );
        const wrapper = mount(<PreferenceFormattedBytesComponent value={bytes} />);
        expect(wrapper.text()).toEqual('2.7MB');
      });

      test('it renders bytes supplied as a number according to the default format', () => {
        mockUseUiSetting$.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_browser)
        );
        const wrapper = mount(<PreferenceFormattedBytesComponent value={+bytes} />);
        expect(wrapper.text()).toEqual('2.7MB');
      });

      test('it renders bytes according to new format', () => {
        mockUseUiSetting$.mockImplementation(getMockKibanaUiSetting(mockFrameworks.bytes_short));
        const wrapper = mount(<PreferenceFormattedBytesComponent value={bytes} />);
        expect(wrapper.text()).toEqual('3MB');
      });
    });
  });
});
