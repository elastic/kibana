/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { SecureSpaceMessage } from './secure_space_message';

let mockShowLinks: boolean = true;
jest.mock('../../../../../xpack_main/public/services/xpack_info', () => {
  return {
    xpackInfo: {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'features.security.showLinks') {
          return mockShowLinks;
        }
        throw new Error(`unexpected key: ${key}`);
      }),
    },
  };
});

describe('SecureSpaceMessage', () => {
  it(`doesn't render if security is not enabled`, () => {
    mockShowLinks = false;
    expect(shallowWithIntl(<SecureSpaceMessage />)).toMatchSnapshot();
  });

  it(`renders if security is enabled`, () => {
    mockShowLinks = true;
    expect(shallowWithIntl(<SecureSpaceMessage />)).toMatchSnapshot();
  });
});
