/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { FlexItemSetting } from './flex_item_setting';

describe('FlexItemSetting component', () => {
  let props;

  beforeEach(() => {
    props = {
      formRowLabelText: 'label text',
      formRowTooltipText: 'tooltip text',
    };
  });

  it('renders component and children as expected', () => {
    const wrapper = shallow(
      <FlexItemSetting {...props}>
        <p>The child elements</p>
      </FlexItemSetting>
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('renders a null label if label/tooltip text not supplied', () => {
    const wrapper = shallow(
      <FlexItemSetting>
        <p>The child elements</p>
      </FlexItemSetting>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
