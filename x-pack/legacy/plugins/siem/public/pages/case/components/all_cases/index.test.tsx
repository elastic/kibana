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
  const setFilters = jest.fn();
  const setQueryParams = jest.fn();
  const setSelectedCases = jest.fn();
  const getCaseCount = jest.fn();
  const dispatchUpdateCaseProperty = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(apiHook, 'useGetCases').mockReturnValue({
      ...useGetCasesMockState,
      dispatchUpdateCaseProperty,
      getCaseCount,
      setFilters,
      setQueryParams,
      setSelectedCases,
    });
    moment.tz.setDefault('UTC');
  });
  it('should render AllCases', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases />
      </TestProviders>
    );
    expect(
      wrapper
        .find(`a[data-test-subj="case-details-link"]`)
        .first()
        .prop('href')
    ).toEqual(`#/link-to/case/${useGetCasesMockState.data.cases[0].id}`);
    expect(
      wrapper
        .find(`a[data-test-subj="case-details-link"]`)
        .first()
        .text()
    ).toEqual(useGetCasesMockState.data.cases[0].title);
    expect(
      wrapper
        .find(`span[data-test-subj="case-table-column-tags-0"]`)
        .first()
        .prop('title')
    ).toEqual(useGetCasesMockState.data.cases[0].tags[0]);
    expect(
      wrapper
        .find(`[data-test-subj="case-table-column-createdBy"]`)
        .first()
        .text()
    ).toEqual(useGetCasesMockState.data.cases[0].createdBy.username);
    expect(
      wrapper
        .find(`[data-test-subj="case-table-column-createdAt"]`)
        .first()
        .prop('value')
    ).toEqual(useGetCasesMockState.data.cases[0].createdAt);
    expect(
      wrapper
        .find(`[data-test-subj="case-table-case-count"]`)
        .first()
        .text()
    ).toEqual('Showing 10 cases');
  });
  it('should tableHeaderSortButton AllCases', () => {
    const wrapper = mount(
      <TestProviders>
        <AllCases />
      </TestProviders>
    );
    wrapper
      .find('[data-test-subj="tableHeaderSortButton"]')
      .first()
      .simulate('click');
    expect(setQueryParams).toBeCalledWith({
      page: 1,
      perPage: 5,
      sortField: 'createdAt',
      sortOrder: 'asc',
    });
  });
});
