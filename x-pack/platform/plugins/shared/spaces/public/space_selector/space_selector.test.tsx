/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { of } from 'rxjs';

import { customBrandingServiceMock } from '@kbn/core-custom-branding-browser-mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { SpaceSelector, type SpaceSelectorProps, VIEW_MODE_THRESHOLD } from './space_selector';
import type { Space } from '../../common';
import { spacesManagerMock } from '../spaces_manager/mocks';

function getSpacesManager(spaces: Space[] = []) {
  const manager = spacesManagerMock.create();
  manager.getSpaces = jest.fn().mockResolvedValue(spaces);
  return manager;
}

const renderScreen = (props: SpaceSelectorProps) => {
  const queryClient = new QueryClient();

  return renderWithI18n(
    <QueryClientProvider client={queryClient}>
      <SpaceSelector {...props} />
    </QueryClientProvider>
  );
};

test('it renders without crashing', () => {
  const spacesManager = getSpacesManager();
  const customBranding$ = of({});
  renderScreen({
    spacesManager,
    serverBasePath: '/server-base-path',
    customBranding$,
  });

  expect(screen.getByTestId('kibanaSpaceSelector')).toBeInTheDocument();
});

test('it renders with custom logo', () => {
  const spacesManager = getSpacesManager();
  const customBranding$ = of({ logo: 'img.jpg' });
  renderScreen({
    spacesManager,
    serverBasePath: '/server-base-path',
    customBranding$,
  });

  expect(screen.getByTestId('kibanaSpaceSelector')).toMatchSnapshot();
  expect(screen.getByAltText('Custom logo')).toBeInTheDocument();
});

test('it queries for spaces when loaded', async () => {
  const spaces = [
    {
      id: 'space-1',
      name: 'Space 1',
      description: 'This is the first space',
      disabledFeatures: [],
    },
  ];

  const spacesManager = getSpacesManager(spaces);

  renderScreen({
    spacesManager,
    serverBasePath: '/server-base-path',
    customBranding$: customBrandingServiceMock.createStartContract().customBranding$,
  });

  expect(screen.queryByRole('progressbar')).toBeInTheDocument();

  await waitFor(() => {
    expect(spacesManager.getSpaces).toHaveBeenCalledTimes(1);
  });
});

test('it renders the list filter controls when the spaces list exceeds the threshold', async () => {
  const spaces = Array.from({ length: VIEW_MODE_THRESHOLD + 1 }, (_, index) => ({
    id: `space-${index}`,
    name: `Space ${index}`,
    description: `This is the ${index} space`,
    disabledFeatures: [],
  }));

  const spacesManager = getSpacesManager(spaces);

  renderScreen({
    spacesManager,
    serverBasePath: '/server-base-path',
    customBranding$: customBrandingServiceMock.createStartContract().customBranding$,
  });

  await waitFor(() => {
    expect(screen.getByTestId('kibanaSpaceSelectorSearchField')).toBeInTheDocument();
    expect(screen.getByTestId('kibanaSpaceSelectorViewToggle')).toBeInTheDocument();
  });
});

test('it displays only spaces matching the search term', async () => {
  const spaces = Array.from({ length: VIEW_MODE_THRESHOLD + 1 }, (_, index) => ({
    id: `space-${index}`,
    name: `Space ${index}`,
    description: `This is the ${index} space`,
    disabledFeatures: [],
  }));

  const spacesManager = getSpacesManager(spaces);

  const user = userEvent.setup();

  renderScreen({
    spacesManager,
    serverBasePath: '/server-base-path',
    customBranding$: customBrandingServiceMock.createStartContract().customBranding$,
  });

  await waitFor(() => {
    expect(screen.getByTestId('kibanaSpaceSelectorSearchField')).toBeInTheDocument();
    expect(screen.getByTestId('kibanaSpaceSelectorViewToggle')).toBeInTheDocument();
  });

  await user.type(screen.getByTestId('kibanaSpaceSelectorSearchField'), 'Space 1');

  await waitFor(() => {
    expect(screen.getByText('Space 1')).toBeInTheDocument();
    expect(screen.getByText('Space 10')).toBeInTheDocument();
  });
});
