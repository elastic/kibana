/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Home } from '../Home';

jest.mock('ui/index_patterns');
jest.mock('ui/new_platform');

jest.mock('../../../../../code/public/components/code_block', () => ({
  CodeBlock: () => null
}));

describe('Home component', () => {
  it('should render services', () => {
    expect(shallow(<Home tab="services" />)).toMatchSnapshot();
  });

  it('should render traces', () => {
    expect(shallow(<Home tab="traces" />)).toMatchSnapshot();
  });
});
