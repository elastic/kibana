/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ExplorerNoResultsFound } from './explorer_no_results_found';

describe('ExplorerNoInfluencersFound', () => {
  test('snapshot', () => {
    const wrapper = shallow(<ExplorerNoResultsFound />);
    expect(wrapper).toMatchSnapshot();
  });
});
