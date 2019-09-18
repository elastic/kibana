/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { Context } from '../../../context/mock';
import { Footer } from '../footer.container';

describe('<Footer />', () => {
  test('null workpad renders nothing', () => {
    expect(mount(<Footer />).isEmptyRender());
  });

  const wrapper = mount(
    <Context>
      <Footer />
    </Context>
  );

  const scrubber = () => wrapper.find('Scrubber').slice(1, 2);
  const center = () => wrapper.find('EuiButtonEmpty[data-test-subj="pageControlsCurrentPage"]');

  test('scrubber functions properly', () => {
    expect(scrubber().prop('isScrubberVisible')).toBeFalsy();
    center().simulate('click');
    expect(scrubber().prop('isScrubberVisible')).toBeTruthy();
  });
});
