/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { SpaceAvatar } from '../../components';
import { spacesManagerMock } from '../../lib/mocks';
import { SpacesHeaderNavButton } from './components/spaces_header_nav_button';
import { NavControlPopover } from './nav_control_popover';

describe('NavControlPopover', () => {
  it('renders without crashing', () => {
    const spacesManager = spacesManagerMock.create();

    const wrapper = shallow(
      <NavControlPopover
        spacesManager={spacesManager}
        anchorPosition={'downRight'}
        buttonClass={SpacesHeaderNavButton}
        capabilities={{ navLinks: {}, management: {}, catalogue: {}, spaces: { manage: true } }}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders a SpaceAvatar with the active space', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.getSpaces = jest.fn().mockResolvedValue([
      {
        id: 'foo-space',
        name: 'foo',
        disabledFeatures: [],
      },
      {
        id: 'bar-space',
        name: 'bar',
        disabledFeatures: [],
      },
    ]);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue({
      id: 'foo-space',
      name: 'foo',
      disabledFeatures: [],
    });

    const wrapper = mount<any, any>(
      <NavControlPopover
        spacesManager={spacesManager}
        anchorPosition={'rightCenter'}
        buttonClass={SpacesHeaderNavButton}
        capabilities={{ navLinks: {}, management: {}, catalogue: {}, spaces: { manage: true } }}
      />
    );

    return new Promise(resolve => {
      setTimeout(() => {
        expect(wrapper.state().spaces).toHaveLength(2);
        wrapper.update();
        expect(wrapper.find(SpaceAvatar)).toHaveLength(1);
        resolve();
      }, 20);
    });
  });
});
