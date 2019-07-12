/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { CreateJobButton } from './create_job_button';

describe('Data Frame: Job List <CreateJobButton />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(<CreateJobButton />);

    expect(wrapper).toMatchSnapshot();
  });
});
