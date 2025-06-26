/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiImage } from '@elastic/eui';
import React from 'react';
import { of } from 'rxjs';

import { customBrandingServiceMock } from '@kbn/core-custom-branding-browser-mocks';
import { KibanaSolutionAvatar } from '@kbn/shared-ux-avatar-solution';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

import { SpaceSelector } from './space_selector';
import type { Space } from '../../common';
import { spacesManagerMock } from '../spaces_manager/mocks';

function getSpacesManager(spaces: Space[] = []) {
  const manager = spacesManagerMock.create();
  manager.getSpaces = jest.fn().mockResolvedValue(spaces);
  return manager;
}

test('it renders without crashing', () => {
  const spacesManager = getSpacesManager();
  const customBranding$ = of({});
  const component = shallowWithIntl(
    <SpaceSelector
      spacesManager={spacesManager as any}
      serverBasePath={'/server-base-path'}
      customBranding$={customBranding$}
    />
  );
  expect(component).toMatchSnapshot();
});

test('it renders with custom logo', () => {
  const spacesManager = getSpacesManager();
  const customBranding$ = of({ logo: 'img.jpg' });
  const component = shallowWithIntl(
    <SpaceSelector
      spacesManager={spacesManager as any}
      serverBasePath={'/server-base-path'}
      customBranding$={customBranding$}
    />
  );
  expect(component).toMatchSnapshot();
  expect(component.find(KibanaSolutionAvatar).length).toBe(0);
  expect(component.find(EuiImage).length).toBe(1);
});

test('it queries for spaces when loaded', () => {
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
    <SpaceSelector
      spacesManager={spacesManager as any}
      serverBasePath={'/server-base-path'}
      customBranding$={customBrandingServiceMock.createStartContract().customBranding$}
    />
  );

  return Promise.resolve().then(() => {
    expect(spacesManager.getSpaces).toHaveBeenCalledTimes(1);
  });
});
