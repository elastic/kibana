/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { ManageSpacesButton } from './manage_spaces_button';

describe('ManageSpacesButton', () => {
  it('renders as expected', () => {
    const component = (
      <ManageSpacesButton
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
