/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { JestContext } from '../../test/context_jest';
import { getScrubber as scrubber, getPageControlsCenter as center } from '../../test/selectors';
import { CanvasContainer } from '../canvas.container';

describe('<Canvas />', () => {
  test('null workpad renders nothing', () => {
    expect(mount(<CanvasContainer />).isEmptyRender());
  });

  let wrapper: ReactWrapper;

  beforeEach(() => {
    wrapper = mount(
      <JestContext source="austin">
        <CanvasContainer />
      </JestContext>
    );
  });

  test('scrubber opens and closes', () => {
    expect(scrubber(wrapper).prop('isScrubberVisible')).toEqual(false);
    center(wrapper).simulate('click');
    expect(scrubber(wrapper).prop('isScrubberVisible')).toEqual(true);
  });
});
