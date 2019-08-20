/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { SpaceValidator } from '../../lib';
import { SpaceIdentifier } from './space_identifier';

test('renders without crashing', () => {
  const props = {
    space: {
      id: '',
      name: '',
    },
    editable: true,
    onChange: jest.fn(),
    validator: new SpaceValidator(),
  };
  const wrapper = shallowWithIntl(
    <SpaceIdentifier.WrappedComponent {...props} intl={null as any} />
  );
  expect(wrapper).toMatchSnapshot();
});
