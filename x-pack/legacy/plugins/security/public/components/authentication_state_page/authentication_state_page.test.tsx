/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { AuthenticationStatePage } from './authentication_state_page';
import React from 'react';

describe('AuthenticationStatePage', () => {
  it('renders', () => {
    expect(
      shallowWithIntl(
        <AuthenticationStatePage title={'foo'}>
          <span>hello world</span>
        </AuthenticationStatePage>
      )
    ).toMatchSnapshot();
  });
});
