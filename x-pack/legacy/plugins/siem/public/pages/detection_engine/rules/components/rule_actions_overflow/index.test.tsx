/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { RuleActionsOverflow } from './index';
import { mockRule } from '../../all/__mocks__/mock';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
}));

describe('RuleActionsOverflow', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
