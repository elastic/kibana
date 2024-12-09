/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { AuthenticationStatePage } from './authentication_state_page';

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

  it('renders with custom CSS class', () => {
    expect(
      shallowWithIntl(
        <AuthenticationStatePage className="customClassName" title={'foo'}>
          <span>hello world</span>
        </AuthenticationStatePage>
      ).exists('.secAuthenticationStatePage.customClassName')
    ).toBe(true);
  });
});
