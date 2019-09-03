/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { JobsTable } from './jobs_table';
import { mockJobsSummaryResponse } from '../__mocks__/api';

describe('JobsTable', () => {
  const onJobStateChangeMock = jest.fn();

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
});
