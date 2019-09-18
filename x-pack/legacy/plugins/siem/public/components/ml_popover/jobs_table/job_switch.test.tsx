/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { isChecked, isFailure, isJobLoading, JobSwitch } from './job_switch';
import { mockOpenedJob } from '../__mocks__/api';

describe('JobSwitch', () => {
  let onJobStateChangeMock = jest.fn();
  beforeEach(() => {
    onJobStateChangeMock = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <JobSwitch job={mockOpenedJob} isSummaryLoading={false} onJobStateChange={jest.fn()} />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('should call onJobStateChange when the switch is clicked to a a true/open', () => {
    const wrapper = mount(
      <JobSwitch
        isSummaryLoading={false}
        job={mockOpenedJob}
        onJobStateChange={onJobStateChangeMock}
      />
    );

    wrapper
      .find('[data-test-subj="job-switch"] input')
      .first()
      .simulate('change', {
        target: { checked: true },
      });

    expect(onJobStateChangeMock.mock.calls[0]).toEqual([
      'siem-api-rare_process_linux_ecs',
      1562870521264,
      true,
    ]);
  });

  test('should have a switch when it is not in the loading state', () => {
    const wrapper = mount(
      <JobSwitch
        isSummaryLoading={false}
        job={mockOpenedJob}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(true);
  });

  test('should not have a switch when it is in the loading state', () => {
    const wrapper = mount(
      <JobSwitch
        isSummaryLoading={true}
        job={mockOpenedJob}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(false);
  });

  describe('isChecked', () => {
    test('returns false if only jobState is enabled', () => {
      expect(isChecked('started', 'closing')).toBe(false);
    });

    test('returns false if only datafeedState is enabled', () => {
      expect(isChecked('stopping', 'opened')).toBe(false);
    });

    test('returns true if both enabled states are provided', () => {
      expect(isChecked('started', 'opened')).toBe(true);
    });
  });

  describe('isJobLoading', () => {
    test('returns true if both loading states are not provided', () => {
      expect(isJobLoading('started', 'closing')).toBe(true);
    });

    test('returns true if only jobState is loading', () => {
      expect(isJobLoading('starting', 'opened')).toBe(true);
    });

    test('returns true if only datafeedState is loading', () => {
      expect(isJobLoading('started', 'opening')).toBe(true);
    });

    test('returns false if both disabling states are provided', () => {
      expect(isJobLoading('stopping', 'closing')).toBe(true);
    });
  });

  describe('isFailure', () => {
    test('returns true if only jobState is failure/deleted', () => {
      expect(isFailure('failed', 'stopping')).toBe(true);
    });

    test('returns true if only dataFeed is failure/deleted', () => {
      expect(isFailure('started', 'deleted')).toBe(true);
    });

    test('returns true if both enabled states are failure/deleted', () => {
      expect(isFailure('failed', 'deleted')).toBe(true);
    });

    test('returns false only if both states are not failure/deleted', () => {
      expect(isFailure('opened', 'stopping')).toBe(false);
    });
  });
});
