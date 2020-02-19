/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import moment from 'moment-timezone';
import { AllCases } from './';
import { TestProviders } from '../../../../mock';
import { useGetCasesMockState } from './__mock__';
import * as apiHook from '../../../../containers/case/use_get_cases';

describe('AllCases', () => {
  const setQueryParams = jest.fn();
  const setFilters = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .spyOn(apiHook, 'useGetCases')
      .mockReturnValue([useGetCasesMockState, setQueryParams, setFilters]);
    moment.tz.setDefault('UTC');
  });
  it('should render AllCases', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases />
      </TestProviders>
    );
    expect(wrapper.find(AllCases)).toMatchSnapshot();
  });
  it('should tableHeaderSortButton AllCases', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases />
      </TestProviders>
    );
    wrapper
      .find('[data-test-subj="tableHeaderCell_state_5"] [data-test-subj="tableHeaderSortButton"]')
      .simulate('click');
    expect(setQueryParams).toBeCalledWith({
      page: 1,
      perPage: 5,
      sortField: 'state',
      sortOrder: 'asc',
    });
  });
});
