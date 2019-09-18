/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { Context } from '../../../context/mock';
import { PagePreview } from '../page_preview.container';

describe('<PagePreview />', () => {
  test('null workpad renders nothing', () => {
    expect(mount(<PagePreview height={100} index={0} />).isEmptyRender());
  });

  const wrapper = mount(
    <Context>
      <PagePreview height={100} index={0} />
    </Context>
  );

  const markdown = () => wrapper.find('.render');

  test('renders as expected', () => {
    expect(markdown().text()).toEqual('markdown mock');
  });
});
