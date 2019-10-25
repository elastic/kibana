/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import moment from 'moment-timezone';
import * as React from 'react';

import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';

import { mockFrameworks, TestProviders, MockFrameworks, getMockKibanaUiSetting } from '../../mock';

import { PreferenceFormattedDate, FormattedDate, FormattedRelativePreferenceDate } from '.';
import { getEmptyString, getEmptyValue } from '../empty_value';

const mockUseKibanaUiSetting: jest.Mock = useKibanaUiSetting as jest.Mock;
jest.mock('../../lib/settings/use_kibana_ui_setting', () => ({
  useKibanaUiSetting: jest.fn(),
}));

describe('formatted_date', () => {
  describe('PreferenceFormattedDate', () => {
    describe('rendering', () => {
      beforeEach(() => {
        mockUseKibanaUiSetting.mockClear();
      });
      const isoDateString = '2019-02-25T22:27:05.000Z';
      const isoDate = new Date(isoDateString);
      const configFormattedDateString = (dateString: string, config: MockFrameworks): string =>
        moment
          .tz(
            dateString,
            config.dateFormatTz! === 'Browser' ? config.timezone! : config.dateFormatTz!
          )
          .format(config.dateFormat);

      test('renders correctly against snapshot', () => {
        const wrapper = shallow(<PreferenceFormattedDate value={isoDate} />);
        expect(toJson(wrapper)).toMatchSnapshot();
      });

      test('it renders the UTC ISO8601 date string supplied when no configuration exists', () => {
        mockUseKibanaUiSetting.mockImplementation(() => [null]);
        const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);
        expect(wrapper.text()).toEqual(isoDateString);
      });

      test('it renders the UTC ISO8601 date supplied when the default configuration exists', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_UTC)
        );

        const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);
        expect(wrapper.text()).toEqual(
          configFormattedDateString(isoDateString, mockFrameworks.default_UTC)
        );
      });

      test('it renders the correct tz when the default browser configuration exists', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_browser)
        );
        const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);
        expect(wrapper.text()).toEqual(
          configFormattedDateString(isoDateString, mockFrameworks.default_browser)
        );
      });

      test('it renders the correct tz when a non-UTC configuration exists', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_MT)
        );
        const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);
        expect(wrapper.text()).toEqual(
          configFormattedDateString(isoDateString, mockFrameworks.default_MT)
        );
      });
    });
  });

  describe('FormattedDate', () => {
    describe('rendering', () => {
      beforeEach(() => {
        mockUseKibanaUiSetting.mockClear();
      });

      test('it renders against a numeric epoch', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_UTC)
        );
        const wrapper = mount(<FormattedDate fieldName="@timestamp" value={1559079339000} />);
        expect(wrapper.text()).toEqual('May 28, 2019 @ 21:35:39.000');
      });

      test('it renders against a string epoch', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_UTC)
        );
        const wrapper = mount(<FormattedDate fieldName="@timestamp" value={'1559079339000'} />);
        expect(wrapper.text()).toEqual('May 28, 2019 @ 21:35:39.000');
      });

      test('it renders against a ISO string', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_UTC)
        );
        const wrapper = mount(
          <FormattedDate fieldName="@timestamp" value={'2019-05-28T22:04:49.957Z'} />
        );
        expect(wrapper.text()).toEqual('May 28, 2019 @ 22:04:49.957');
      });

      test('it renders against an empty string as an empty string placeholder', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_UTC)
        );
        const wrapper = mount(
          <TestProviders>
            <FormattedDate fieldName="@timestamp" value={''} />
          </TestProviders>
        );
        expect(wrapper.text()).toEqual('(Empty String)');
      });

      test('it renders against an null as a EMPTY_VALUE', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_UTC)
        );
        const wrapper = mount(
          <TestProviders>
            <FormattedDate fieldName="@timestamp" value={null} />
          </TestProviders>
        );
        expect(wrapper.text()).toEqual(getEmptyValue());
      });

      test('it renders against an undefined as a EMPTY_VALUE', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_UTC)
        );
        const wrapper = mount(
          <TestProviders>
            <FormattedDate fieldName="@timestamp" value={undefined} />
          </TestProviders>
        );
        expect(wrapper.text()).toEqual(getEmptyValue());
      });

      test('it renders against an invalid date time as just the string its self', () => {
        mockUseKibanaUiSetting.mockImplementation(
          getMockKibanaUiSetting(mockFrameworks.default_UTC)
        );
        const wrapper = mount(
          <TestProviders>
            <FormattedDate fieldName="@timestamp" value={'Rebecca Evan Braden'} />
          </TestProviders>
        );
        expect(wrapper.text()).toEqual('Rebecca Evan Braden');
      });
    });
  });

  describe('FormattedRelativePreferenceDate', () => {
    describe('rendering', () => {
      test('renders time over an hour correctly against snapshot', () => {
        const isoDateString = '2019-02-25T22:27:05.000Z';
        const wrapper = shallow(<FormattedRelativePreferenceDate value={isoDateString} />);
        expect(wrapper.find('[data-test-subj="preference-time"]').exists()).toBe(true);
      });
      test('renders time under an hour correctly against snapshot', () => {
        const timeTwelveMinutesAgo = new Date(new Date().getTime() - 12 * 60 * 1000).toISOString();
        const wrapper = shallow(<FormattedRelativePreferenceDate value={timeTwelveMinutesAgo} />);
        expect(wrapper.find('[data-test-subj="relative-time"]').exists()).toBe(true);
      });
      test('renders empty string value correctly', () => {
        const wrapper = mount(
          <TestProviders>
            <FormattedRelativePreferenceDate value={''} />
          </TestProviders>
        );
        expect(wrapper.text()).toBe(getEmptyString());
      });

      test('renders undefined value correctly', () => {
        const wrapper = mount(
          <TestProviders>
            <FormattedRelativePreferenceDate />
          </TestProviders>
        );
        expect(wrapper.text()).toBe(getEmptyValue());
      });

      test('renders null value correctly', () => {
        const wrapper = mount(
          <TestProviders>
            <FormattedRelativePreferenceDate value={null} />
          </TestProviders>
        );
        expect(wrapper.text()).toBe(getEmptyValue());
      });
    });
  });
});
