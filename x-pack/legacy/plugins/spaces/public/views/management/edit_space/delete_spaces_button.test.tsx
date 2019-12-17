/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { DeleteSpacesButton } from './delete_spaces_button';
import { spacesManagerMock } from '../../../lib/mocks';
import { SpacesManager } from '../../../lib';

const space = {
  id: 'my-space',
  name: 'My Space',
  disabledFeatures: [],
};

describe('DeleteSpacesButton', () => {
  it('renders as expected', () => {
    const spacesManager = spacesManagerMock.create();

    const wrapper = shallowWithIntl(
      <DeleteSpacesButton.WrappedComponent
        space={space}
        spacesManager={(spacesManager as unknown) as SpacesManager}
        onDelete={jest.fn()}
        intl={null as any}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
