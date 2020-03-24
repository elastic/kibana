/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { ConfigureCases } from './';
import { TestProviders } from '../../../../mock';

describe('CaseView ', () => {
  test('it renders', () => {
    const wrapper = mount(
      <TestProviders>
        <ConfigureCases />
      </TestProviders>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
