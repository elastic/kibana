/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { ManageSpacesButton } from './manage_spaces_button';

describe('ManageSpacesButton', () => {
  it('renders as expected', () => {
    const component = (
      <ManageSpacesButton
        navigateToApp={jest.fn()}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: {
            manage: true,
          },
        }}
      />
    );
    expect(shallowWithIntl(component)).toMatchSnapshot();
  });

  it(`doesn't render if user profile forbids managing spaces`, () => {
    const component = (
      <ManageSpacesButton
        navigateToApp={jest.fn()}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: {
            manage: false,
          },
        }}
      />
    );
    expect(shallowWithIntl(component)).toMatchSnapshot();
  });
});
