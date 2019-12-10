/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Job } from '../../new_job/common/job_creator/configs';
import { CustomUrlList, CustomUrlListProps } from './list';

function prepareTest(setCustomUrlsFn: jest.Mock) {
  const customUrls = [
    {
      url_name: 'Show data',
      time_range: 'auto',
      url_value:
        "kibana#/discover?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=" +
        '(index:e532ba80-b76f-11e8-a9dc-37914a458883,query:(language:lucene,query:\'airline:"$airline$"\'))',
    },
    {
      url_name: 'Show dashboard',
      time_range: '1h',
      url_value:
        'kibana#/dashboard/52ea8840-bbef-11e8-a04d-b1701b2b977e?_g=' +
        "(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&" +
        '_a=(filters:!(),query:(language:lucene,query:\'airline:"$airline$"\'))',
    },
    {
      url_name: 'Show airline',
      time_range: 'auto',
      url_value: 'http://airlinecodes.info/airline-code-$airline$',
    },
  ];

  const props: CustomUrlListProps = {
    job: {} as Job,
    customUrls,
    setCustomUrls: setCustomUrlsFn,
  };

  return shallow(<CustomUrlList {...props} />);
}

describe('CustomUrlList', () => {
  const setCustomUrls = jest.fn(() => {});

  test('renders a list of custom URLs', () => {
    const wrapper = prepareTest(setCustomUrls);
    expect(wrapper).toMatchSnapshot();
  });

  test('switches custom URL field to textarea and calls setCustomUrls on change', () => {
    const wrapper = prepareTest(setCustomUrls);
    wrapper.update();
    const url1LabelInput = wrapper.find('[data-test-subj="mlJobEditCustomUrlInput_0"]');
    url1LabelInput.simulate('focus');
    wrapper.update();
    const url1LabelTextarea = wrapper.find('[data-test-subj="mlJobEditCustomUrlTextarea_0"]');
    expect(url1LabelTextarea).toBeDefined();
    url1LabelTextarea.simulate('change', { target: { value: 'Edit' } });
    wrapper.update();
    expect(setCustomUrls).toHaveBeenCalled();
  });
});
