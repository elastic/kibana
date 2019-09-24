/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { Panel } from '.';
import React from 'react';

describe('Panel', () => {
  test('it does not have the boolean loading as a Eui Property', () => {
    const wrapper = mount(<Panel loading={true} />);
    expect(Object.keys(wrapper.find('EuiPanel').props())).not.toContain('loading');
  });
});
