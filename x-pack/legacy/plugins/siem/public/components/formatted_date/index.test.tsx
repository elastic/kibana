/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { useDateFormat, useTimeZone } from '../../hooks';

import { TestProviders } from '../../mock';
import { getEmptyString, getEmptyValue } from '../empty_value';
import { PreferenceFormattedDate, FormattedDate, FormattedRelativePreferenceDate } from '.';

jest.mock('../../hooks');
const mockUseDateFormat = useDateFormat as jest.Mock;
const mockUseTimeZone = useTimeZone as jest.Mock;

const isoDateString = '2019-02-25T22:27:05.000Z';

describe('formatted_date', () => {
  let isoDate: Date;

  beforeEach(() => {
    isoDate = new Date(isoDateString);
    mockUseDateFormat.mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');
    mockUseTimeZone.mockImplementation(() => 'UTC');
  });

  describe('PreferenceFormattedDate', () => {
    test('renders correctly against snapshot', () => {
      mockUseDateFormat.mockImplementation(() => null);
      const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the date with the default configuration', () => {
      const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);

      expect(wrapper.text()).toEqual('Feb 25, 2019 @ 22:27:05.000');
    });

    test('it renders a UTC ISO8601 date string supplied when no configuration exists', () => {
      mockUseDateFormat.mockImplementation(() => null);
      mockUseTimeZone.mockImplementation(() => null);
      const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);

      expect(wrapper.text()).toEqual(isoDateString);
    });

    test('it renders the correct timezone when a non-UTC configuration exists', () => {
      mockUseTimeZone.mockImplementation(() => 'America/Denver');
      const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);

      expect(wrapper.text()).toEqual('Feb 25, 2019 @ 15:27:05.000');
    });

    test('it renders the date with a user-defined format', () => {
      mockUseDateFormat.mockImplementation(() => 'MMM-DD-YYYY');
      const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);

      expect(wrapper.text()).toEqual('Feb-25-2019');
    });
  });

  describe('FormattedDate', () => {
    test('it renders against a numeric epoch', () => {
      const wrapper = mount(<FormattedDate fieldName="@timestamp" value={1559079339000} />);
      expect(wrapper.text()).toEqual('May 28, 2019 @ 21:35:39.000');
    });

    test('it renders against a string epoch', () => {
      const wrapper = mount(<FormattedDate fieldName="@timestamp" value={'1559079339000'} />);
      expect(wrapper.text()).toEqual('May 28, 2019 @ 21:35:39.000');
    });

    test('it renders against a ISO string', () => {
      const wrapper = mount(
        <FormattedDate fieldName="@timestamp" value={'2019-05-28T22:04:49.957Z'} />
      );
      expect(wrapper.text()).toEqual('May 28, 2019 @ 22:04:49.957');
    });

    test('it renders against an empty string as an empty string placeholder', () => {
      const wrapper = mount(
        <TestProviders>
          <FormattedDate fieldName="@timestamp" value={''} />
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('(Empty String)');
    });

    test('it renders against an null as a EMPTY_VALUE', () => {
      const wrapper = mount(
        <TestProviders>
          <FormattedDate fieldName="@timestamp" value={null} />
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('it renders against an undefined as a EMPTY_VALUE', () => {
      const wrapper = mount(
        <TestProviders>
          <FormattedDate fieldName="@timestamp" value={undefined} />
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('it renders against an invalid date time as just the string its self', () => {
      const wrapper = mount(
        <TestProviders>
          <FormattedDate fieldName="@timestamp" value={'Rebecca Evan Braden'} />
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('Rebecca Evan Braden');
    });
  });

  describe('FormattedRelativePreferenceDate', () => {
    test('renders time over an hour correctly against snapshot', () => {
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
