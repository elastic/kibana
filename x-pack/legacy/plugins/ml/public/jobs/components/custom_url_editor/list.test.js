/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Mock the mlJobService that is used for testing custom URLs.
jest.mock('../../../services/job_service.js', () => 'mlJobService');

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { CustomUrlList } from './list';

function prepareTest(setCustomUrlsFn) {

  const customUrls = [
    {
      url_name: 'Show data',
      time_range: 'auto',
      url_value: 'kibana#/discover?_g=(time:(from:\'$earliest$\',mode:absolute,to:\'$latest$\'))&_a=' +
        '(index:e532ba80-b76f-11e8-a9dc-37914a458883,query:(language:lucene,query:\'airline:"$airline$"\'))'
    },
    {
      url_name: 'Show dashboard',
      time_range: '1h',
      url_value: 'kibana#/dashboard/52ea8840-bbef-11e8-a04d-b1701b2b977e?_g=' +
        '(time:(from:\'$earliest$\',mode:absolute,to:\'$latest$\'))&' +
        '_a=(filters:!(),query:(language:lucene,query:\'airline:"$airline$"\'))'
    },
    {
      url_name: 'Show airline',
      time_range: 'auto',
      url_value: 'http://airlinecodes.info/airline-code-$airline$'
    },

  ];

  const props = {
    job: {},
    customUrls,
    setCustomUrls: setCustomUrlsFn,
  };

  const wrapper = shallowWithIntl(
    <CustomUrlList.WrappedComponent {...props} />
  );

  return wrapper;
}


describe('CustomUrlList', () => {

  const setCustomUrls = jest.fn(() => {});

  test('renders a list of custom URLs', () => {
    const wrapper = prepareTest(setCustomUrls);
    expect(wrapper).toMatchSnapshot();
  });

  test('calls setCustomUrls on updating a custom URL field', () => {
    const wrapper = prepareTest(setCustomUrls);
    const url1LabelInput = wrapper.find('EuiFieldText').first();
    url1LabelInput.simulate('change', { target: { value: 'Edit' } });
    wrapper.update();
    expect(setCustomUrls).toHaveBeenCalled();
  });

});
