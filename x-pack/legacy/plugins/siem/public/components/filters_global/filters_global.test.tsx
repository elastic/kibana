/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';
import { StickyContainer } from 'react-sticky';
import { FiltersGlobal } from './filters_global';

import '../../mock/match_media';

describe('rendering', () => {
  test('renders correctly', () => {
    const wrapper = shallow(
      <StickyContainer>
        <FiltersGlobal>
          <p>{'Additional filters here.'}</p>
        </FiltersGlobal>
      </StickyContainer>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
