/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { StickyContainer } from 'react-sticky';

import '../../mock/match_media';
import { FiltersGlobal } from './filters_global';
import { TestProviders } from '../../mock';

describe('rendering', () => {
  test('renders correctly', () => {
    const wrapper = mount(
      <StickyContainer>
        <FiltersGlobal>
          <p>{'Additional filters here.'}</p>
        </FiltersGlobal>
      </StickyContainer>,
      { wrappingComponent: TestProviders }
    );

    expect(wrapper.find('[className="siemFiltersGlobal"]')).toHaveLength(1);
  });
});
