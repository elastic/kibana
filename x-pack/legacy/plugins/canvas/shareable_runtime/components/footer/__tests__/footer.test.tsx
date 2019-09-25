/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { JestContext } from '../../../test/context_jest';
import { getScrubber as scrubber, getPageControlsCenter as center } from '../../../test/selectors';
import { FooterContainer } from '../footer.container';

describe('<Footer />', () => {
  test('null workpad renders nothing', () => {
    expect(mount(<FooterContainer />).isEmptyRender());
  });

  const wrapper = mount(
    <JestContext>
      <FooterContainer />
    </JestContext>
  );

  test('scrubber functions properly', () => {
    expect(scrubber(wrapper).prop('isScrubberVisible')).toEqual(false);
    center(wrapper).simulate('click');
    expect(scrubber(wrapper).prop('isScrubberVisible')).toEqual(true);
  });
});
