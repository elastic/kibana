/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { setMockCapabilities } from '../../../../__mocks__/ui_capabilities';
import { SecureSpaceMessage } from './secure_space_message';

describe('SecureSpaceMessage', () => {
  it(`doesn't render if UI Capabilities does not allow security to be managed`, () => {
    setMockCapabilities({
      navLinks: {},
      management: {},
      catalogue: {},
      spaces: { manage: false },
    });
    expect(shallowWithIntl(<SecureSpaceMessage />)).toMatchSnapshot();
  });

  it(`renders if user profile allows security to be managed`, () => {
    setMockCapabilities({
      navLinks: {},
      management: {},
      catalogue: {},
      spaces: { manage: true },
    });
    expect(shallowWithIntl(<SecureSpaceMessage />)).toMatchSnapshot();
  });
});
