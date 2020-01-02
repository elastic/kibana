/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { mockFrameworks, getMockKibanaUiSetting } from '../../mock';

import { PreferenceFormattedBytesComponent } from '.';

const mockUseKibanaUiSetting: jest.Mock = useKibanaUiSetting as jest.Mock;
jest.mock('../../lib/settings/use_kibana_ui_setting', () => ({
  useKibanaUiSetting: jest.fn(),
}));

describe('formatted_bytes', () => {
  describe('PreferenceFormattedBytes', () => {
    describe('rendering', () => {
      beforeEach(() => {
        mockUseKibanaUiSetting.mockClear();
      });

      const bytes = '2806422';

      test('renders correctly against snapshot', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_browser)
        );
        const wrapper = shallow(<PreferenceFormattedBytesComponent value={bytes} />);
        expect(toJson(wrapper)).toMatchSnapshot();
      });

      test('it renders bytes to hardcoded format when no configuration exists', () => {
        mockUseKibanaUiSetting.mockImplementation(() => [null]);
        const wrapper = mount(<PreferenceFormattedBytesComponent value={bytes} />);
        expect(wrapper.text()).toEqual('2.7MB');
      });

      test('it renders bytes according to the default format', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_browser)
        );
        const wrapper = mount(<PreferenceFormattedBytesComponent value={bytes} />);
        expect(wrapper.text()).toEqual('2.7MB');
      });

      test('it renders bytes supplied as a number according to the default format', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_browser)
        );
        const wrapper = mount(<PreferenceFormattedBytesComponent value={+bytes} />);
        expect(wrapper.text()).toEqual('2.7MB');
      });

      test('it renders bytes according to new format', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.bytes_short)
        );
        const wrapper = mount(<PreferenceFormattedBytesComponent value={bytes} />);
        expect(wrapper.text()).toEqual('3MB');
      });
    });
  });
});
