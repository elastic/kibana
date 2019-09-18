/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { JobsTable } from './jobs_table';
import { mockJobsSummaryResponse } from '../__mocks__/api';

describe('JobsTable', () => {
  let onJobStateChangeMock = jest.fn();
  beforeEach(() => {
    onJobStateChangeMock = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <JobsTable
        isLoading={true}
        jobs={mockJobsSummaryResponse}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('should render the hyper link which points specifically to the job id', () => {
    const wrapper = mount(
      <JobsTable
        isLoading={true}
        jobs={mockJobsSummaryResponse}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(
      wrapper
        .find('[data-test-subj="jobs-table-link"]')
        .first()
        .props().href
    ).toEqual('/test/base/path/app/ml#/jobs?mlManagement=(jobId:rc-rare-process-windows-5)');
  });

  test('should call onJobStateChange when the switch is clicked to a a true/open', () => {
    const wrapper = mount(
      <JobsTable
        isLoading={false}
        jobs={mockJobsSummaryResponse}
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
      'rc-rare-process-windows-5',
      1561402325194,
      true,
    ]);
  });

  test('should have a switch when it is not in the loading state', () => {
    const wrapper = mount(
      <JobsTable
        isLoading={false}
        jobs={mockJobsSummaryResponse}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(true);
  });

  test('should not have a switch when it is in the loading state', () => {
    const wrapper = mount(
      <JobsTable
        isLoading={true}
        jobs={mockJobsSummaryResponse}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(false);
  });
});
