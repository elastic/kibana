/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';

import { OptionalFieldLabel } from './index';

describe('OptionalFieldLabel', () => {
  it('renders correctly', () => {
    const wrapper = shallow(OptionalFieldLabel);

    expect(wrapper.find('EuiTextColor')).toHaveLength(1);
  });
});
