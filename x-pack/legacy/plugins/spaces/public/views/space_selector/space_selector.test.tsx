/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  renderWithIntl,
  shallowWithIntl,
  mountWithIntl,
  nextTick,
} from 'test_utils/enzyme_helpers';
import { Space } from '../../../common/model/space';
import { spacesManagerMock } from '../../lib/mocks';
import { SpaceSelector } from './space_selector';
import { findTestSubject } from 'test_utils/find_test_subject';

function getSpacesManager(spaces: Space[] = []) {
  const manager = spacesManagerMock.create();
  manager.getSpaces = jest.fn().mockResolvedValue(spaces);
  return manager;
}

test('it renders without crashing', () => {
  const spacesManager = getSpacesManager();
  const component = shallowWithIntl(
    <SpaceSelector.WrappedComponent
      spaces={[]}
      spacesManager={spacesManager as any}
      intl={null as any}
    />
  );
  expect(component).toMatchSnapshot();
});

test('it uses the spaces on props, when provided', () => {
  const spacesManager = getSpacesManager();

  const spaces = [
    {
      id: 'space-1',
      name: 'Space 1',
      description: 'This is the first space',
      disabledFeatures: [],
    },
  ];

  const component = renderWithIntl(
    <SpaceSelector.WrappedComponent
      spaces={spaces}
      spacesManager={spacesManager as any}
      intl={null as any}
    />
  );

  return Promise.resolve().then(() => {
    expect(component.find('.spaceCard')).toHaveLength(1);
    expect(spacesManager.getSpaces).toHaveBeenCalledTimes(0);
  });
});

test('it queries for spaces when not provided on props', () => {
  const spaces = [
    {
      id: 'space-1',
      name: 'Space 1',
      description: 'This is the first space',
      disabledFeatures: [],
    },
  ];

  const spacesManager = getSpacesManager(spaces);

  shallowWithIntl(
    <SpaceSelector.WrappedComponent spacesManager={spacesManager as any} intl={null as any} />
  );

  return Promise.resolve().then(() => {
    expect(spacesManager.getSpaces).toHaveBeenCalledTimes(1);
  });
});

test('it renders the search bar when there are 8 or more spaces', async () => {
  const spaces = [1, 2, 3, 4, 5, 6, 7, 8].map(num => ({
    id: `space-${num}`,
    name: `Space ${num}`,
    disabledFeatures: [],
  }));

  const spacesManager = getSpacesManager(spaces);

  const wrapper = mountWithIntl(
    <SpaceSelector.WrappedComponent spacesManager={spacesManager as any} intl={null as any} />
  );

  await nextTick();
  wrapper.update();

  expect(findTestSubject(wrapper, 'spaceSelectorSearchField')).toHaveLength(1);
});

test('it does not render the search bar when there are fewer than 8 spaces', async () => {
  const spaces = [1, 2, 3, 4, 5, 6, 7].map(num => ({
    id: `space-${num}`,
    name: `Space ${num}`,
    disabledFeatures: [],
  }));

  const spacesManager = getSpacesManager(spaces);

  const wrapper = mountWithIntl(
    <SpaceSelector.WrappedComponent spacesManager={spacesManager as any} intl={null as any} />
  );

  await nextTick();
  wrapper.update();

  expect(findTestSubject(wrapper, 'spaceSelectorSearchField')).toHaveLength(0);
});
