/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { SpaceAvatar } from '../../components';
import { spacesManagerMock } from '../../lib/mocks';
import { SpacesManager } from '../../lib';
import { SpacesHeaderNavButton } from './components/spaces_header_nav_button';
import { NavControlPopover } from './nav_control_popover';

describe('NavControlPopover', () => {
  it('renders without crashing', () => {
    const activeSpace = {
      space: { id: '', name: 'foo', disabledFeatures: [] },
      valid: true,
    };

    const spacesManager = spacesManagerMock.create();

    const wrapper = shallow(
      <NavControlPopover
        activeSpace={activeSpace}
        spacesManager={(spacesManager as unknown) as SpacesManager}
        anchorPosition={'downRight'}
        buttonClass={SpacesHeaderNavButton}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders a SpaceAvatar with the active space', async () => {
    const activeSpace = {
      space: { id: 'foo-space', name: 'foo', disabledFeatures: [] },
      valid: true,
    };

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

    const wrapper = mount<any, any>(
      <NavControlPopover
        activeSpace={activeSpace}
        spacesManager={(spacesManager as unknown) as SpacesManager}
        anchorPosition={'rightCenter'}
        buttonClass={SpacesHeaderNavButton}
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
