/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { TestProviders } from '../../../../mock';
import { HistogramSignals } from './index';

describe('HistogramSignals', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <TestProviders>
        <HistogramSignals />
      </TestProviders>
    );

    expect(toJson(wrapper.find('HistogramSignals'))).toMatchSnapshot();
  });
});
