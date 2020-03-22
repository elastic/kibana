/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { ManageMLJobComponent } from '../manage_ml_job';

describe('Manage ML Job', () => {
  it('renders without errors', () => {
    const wrapper = shallowWithIntl(
      <ManageMLJobComponent hasMLJob={true} onEnableJob={jest.fn()} onJobDelete={jest.fn()} />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
