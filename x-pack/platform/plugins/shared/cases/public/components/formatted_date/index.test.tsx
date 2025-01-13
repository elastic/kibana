/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { useDateFormat, useTimeZone } from '../../common/lib/kibana';

import { TestProviders } from '../../common/mock';
import { getEmptyString, getEmptyValue } from '../empty_value';
import { PreferenceFormattedDate, FormattedDate, FormattedRelativePreferenceDate } from '.';

jest.mock('../../common/lib/kibana');
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
      mockUseDateFormat.mockImplementation(() => '');
      const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);

      expect(wrapper).toMatchSnapshot();
    });

    test('it renders the date with the default configuration', () => {
      const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);

      expect(wrapper.text()).toEqual('Feb 25, 2019 @ 22:27:05.000');
    });

    test('it renders a UTC ISO8601 date string supplied when no date format configuration exists', () => {
      mockUseDateFormat.mockImplementation(() => '');
      const wrapper = mount(<PreferenceFormattedDate value={isoDate} />);

      expect(wrapper.text()).toEqual('2019-02-25T22:27:05Z');
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

    test('it strips down milliseconds when stripMs is passed', () => {
      const date = new Date('2022-01-27T10:30:00.000Z');

      const wrapper = mount(<PreferenceFormattedDate value={date} stripMs={true} />);

      expect(wrapper.text()).toEqual('Jan 27, 2022 @ 10:30:00');
    });

    test('it strips down milliseconds when stripMs is passed and user-defined format is used', () => {
      const date = new Date('2022-01-27T10:30:00.000Z');
      mockUseDateFormat.mockImplementation(() => 'HH:mm:ss.SSS');

      const wrapper = mount(<PreferenceFormattedDate value={date} stripMs={true} />);

      expect(wrapper.text()).toEqual('10:30:00');
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

      expect(wrapper.text()).toEqual(getEmptyString());
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

    test('strips down the time milliseconds when stripMs is passed', () => {
      const date = new Date('2022-01-27T10:30:00.000Z');
      const wrapper = mount(
        <TestProviders>
          <FormattedRelativePreferenceDate stripMs={true} value={date.toISOString()} />
        </TestProviders>
      );

      expect(wrapper.text()).toBe('Jan 27, 2022 @ 10:30:00');
    });
  });
});
