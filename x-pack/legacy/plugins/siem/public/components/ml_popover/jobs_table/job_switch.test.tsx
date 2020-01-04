/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import * as React from 'react';

import { isChecked, isFailure, isJobLoading, JobSwitchComponent } from './job_switch';
import { cloneDeep } from 'lodash/fp';
import { mockSiemJobs } from '../__mocks__/api';
import { SiemJob } from '../types';

describe('JobSwitch', () => {
  let siemJobs: SiemJob[];
  let onJobStateChangeMock = jest.fn();
  beforeEach(() => {
    siemJobs = cloneDeep(mockSiemJobs);
    onJobStateChangeMock = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <JobSwitchComponent
        job={siemJobs[0]}
        isSiemJobsLoading={false}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('should call onJobStateChange when the switch is clicked to be true/open', () => {
    const wrapper = mount(
      <JobSwitchComponent
        job={siemJobs[0]}
        isSiemJobsLoading={false}
        onJobStateChange={onJobStateChangeMock}
      />
    );

    wrapper
      .find('button[data-test-subj="job-switch"]')
      .first()
      .simulate('click', {
        target: { checked: true },
      });

    expect(onJobStateChangeMock.mock.calls[0][0].id).toEqual(
      'linux_anomalous_network_activity_ecs'
    );
    expect(onJobStateChangeMock.mock.calls[0][1]).toEqual(1571022859393);
    expect(onJobStateChangeMock.mock.calls[0][2]).toEqual(true);
  });

  test('should have a switch when it is not in the loading state', () => {
    const wrapper = mount(
      <JobSwitchComponent
        isSiemJobsLoading={false}
        job={siemJobs[0]}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(true);
  });

  test('should not have a switch when it is in the loading state', () => {
    const wrapper = mount(
      <JobSwitchComponent
        isSiemJobsLoading={true}
        job={siemJobs[0]}
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
