/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ExplorerNoInfluencersFound } from './explorer_no_influencers_found';

describe('ExplorerNoInfluencersFound', () => {

  test('snapshot', () => {
    const wrapper = shallow(<ExplorerNoInfluencersFound viewBySwimlaneFieldName="field_name" />);
    expect(wrapper).toMatchSnapshot();
  });

});
