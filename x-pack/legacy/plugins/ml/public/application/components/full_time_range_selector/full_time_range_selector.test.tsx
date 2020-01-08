/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { FullTimeRangeSelector } from './index';
import { Query } from 'src/plugins/data/public';
import { IndexPattern } from '../../../../../../../../src/plugins/data/public';

// Create a mock for the setFullTimeRange function in the service.
// The mock is hoisted to the top, so need to prefix the mock function
// with 'mock' so it can be used lazily.
const mockSetFullTimeRange = jest.fn((indexPattern: IndexPattern, query: Query) => true);
jest.mock('./full_time_range_selector_service', () => ({
  setFullTimeRange: (indexPattern: IndexPattern, query: Query) =>
    mockSetFullTimeRange(indexPattern, query),
}));

describe('FullTimeRangeSelector', () => {
  const indexPattern = ({
    id: '0844fc70-5ab5-11e9-935e-836737467b0f',
    fields: [],
    title: 'test-index-pattern',
    timeFieldName: '@timestamp',
  } as unknown) as IndexPattern;

  const query: Query = {
    language: 'kuery',
    query: 'region:us-east-1',
  };

  const requiredProps = {
    indexPattern,
    query,
  };

  test('renders the selector', () => {
    const props = {
      ...requiredProps,
      disabled: false,
    };

    const wrapper = shallowWithIntl(<FullTimeRangeSelector {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('calls setFullTimeRange on clicking button', () => {
    const props = {
      ...requiredProps,
      disabled: false,
    };

    const wrapper = shallowWithIntl(<FullTimeRangeSelector {...props} />);
    wrapper.find('EuiButton').simulate('click');
    expect(mockSetFullTimeRange).toHaveBeenCalled();
  });
});
