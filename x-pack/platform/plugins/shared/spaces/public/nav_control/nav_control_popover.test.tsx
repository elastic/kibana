/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import * as Rx from 'rxjs';

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { NavControlPopover, type Props as NavControlPopoverProps } from './nav_control_popover';
import type { GetSpaceResult, Space } from '../../common';
import { EventTracker } from '../analytics';
import type { SpacesManager } from '../spaces_manager';
import { spacesManagerMock } from '../spaces_manager/mocks';

const mockSpaces = [
  {
    id: 'default',
    name: 'Default Space',
    description: 'this is your default space',
    disabledFeatures: [],
  },
  {
    id: 'space-1',
    name: 'Space 1',
    disabledFeatures: [],
  },
  {
    id: 'space-2',
    name: 'Space 2',
    disabledFeatures: [],
  },
];

const reportEvent = jest.fn();
const eventTracker = new EventTracker({ reportEvent });

describe('NavControlPopover', () => {
  let queryClient: QueryClient;
  let spacesManager: ReturnType<typeof spacesManagerMock.create>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    spacesManager = spacesManagerMock.create();
    spacesManager.getSpaces = jest.fn().mockResolvedValue(mockSpaces);
    jest.clearAllMocks();
  });

  function renderNavControlPopover(props?: Partial<NavControlPopoverProps>, activeSpace?: Space) {
    if (activeSpace) {
      // @ts-ignore readonly check
      spacesManager.onActiveSpaceChange$ = Rx.of(activeSpace);
    }

    const defaultProps: NavControlPopoverProps = {
      spacesManager: spacesManager as unknown as SpacesManager,
      serverBasePath: '/server-base-path',
      anchorPosition: 'rightCenter',
      capabilities: { navLinks: {}, management: {}, catalogue: {}, spaces: { manage: true } },
      navigateToApp: jest.fn(),
      navigateToUrl: jest.fn(),
      allowSolutionVisibility: false,
      eventTracker,
      showTour$: Rx.of(false),
      onFinishTour: jest.fn(),
      manageSpacesLink: '/manage/spaces',
      manageSpacesDocsLink: 'https://elastic.co/docs',
      ...props,
    };

    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <NavControlPopover {...defaultProps} />
      </QueryClientProvider>
    );
  }

  it('renders without crashing', () => {
    renderNavControlPopover();
    expect(screen.getByTestId('spacesNavSelector')).toBeInTheDocument();
  });

  it('renders a SpaceAvatar with the active space', async () => {
    const activeSpace = {
      id: 'default',
      name: 'Default Space',
      description: 'this is your default space',
      disabledFeatures: [],
    };

    renderNavControlPopover({}, activeSpace);

    await waitFor(() => {
      expect(screen.getByTestId('spacesNavSelector')).toBeInTheDocument();
    });

    expect(screen.getByTestId('space-avatar-default')).toBeInTheDocument();
  });

  it('clicking the button opens the spaces menu', async () => {
    const activeSpace = mockSpaces[0];
    renderNavControlPopover({}, activeSpace);

    fireEvent.click(screen.getByTestId('spacesNavSelector'));

    await waitFor(() => {
      expect(screen.getByTestId('spaceMenuPopoverPanel')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Space 1')).toBeInTheDocument();
      expect(screen.getByText('Space 2')).toBeInTheDocument();
    });
  });

  it('should render a search box when there are 8 or more spaces', async () => {
    const manySpaces = [
      ...mockSpaces,
      { id: 'space-3', name: 'Space 3', disabledFeatures: [] },
      { id: 'space-4', name: 'Space 4', disabledFeatures: [] },
      { id: 'space-5', name: 'Space 5', disabledFeatures: [] },
      { id: 'space-6', name: 'Space 6', disabledFeatures: [] },
      { id: 'space-7', name: 'Space 7', disabledFeatures: [] },
      { id: 'space-8', name: 'Space 8', disabledFeatures: [] },
    ];

    spacesManager.getSpaces.mockResolvedValue(manySpaces);
    const activeSpace = manySpaces[0];
    renderNavControlPopover({}, activeSpace);

    fireEvent.click(screen.getByTestId('spacesNavSelector'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Find a space')).toBeInTheDocument();
    });
  });

  it('should not render a search box when there are fewer than 8 spaces', async () => {
    const activeSpace = mockSpaces[0];
    renderNavControlPopover({}, activeSpace);

    fireEvent.click(screen.getByTestId('spacesNavSelector'));

    await waitFor(() => {
      expect(screen.getByTestId('spaceMenuPopoverPanel')).toBeInTheDocument();
    });

    expect(screen.queryByPlaceholderText('Find a space')).not.toBeInTheDocument();
  });

  it('should render solution badges when allowSolutionVisibility is true', async () => {
    const spacesWithSolutions = [
      {
        ...mockSpaces[0],
        solution: 'security' as const,
      },
      {
        ...mockSpaces[1],
        solution: 'observability' as const,
      },
    ];

    spacesManager.getSpaces.mockResolvedValue(spacesWithSolutions as GetSpaceResult[]);
    const activeSpace = spacesWithSolutions[0];

    renderNavControlPopover({ allowSolutionVisibility: true }, activeSpace as Space);

    fireEvent.click(screen.getByTestId('spacesNavSelector'));

    await waitFor(() => {
      expect(screen.getByTestId('spaceMenuPopoverPanel')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Classic')).toBeInTheDocument();
    });
  });

  it('calls navigateToUrl when a space is selected', async () => {
    const navigateToUrl = jest.fn();
    const activeSpace = mockSpaces[0];

    renderNavControlPopover({ navigateToUrl }, activeSpace);

    fireEvent.click(screen.getByTestId('spacesNavSelector'));

    await waitFor(() => {
      expect(screen.getByTestId('spaceMenuPopoverPanel')).toBeInTheDocument();
    });

    await waitFor(() => {
      const spaceButton = screen.getByText('Space 1');
      fireEvent.click(spaceButton);
    });

    await waitFor(() => {
      expect(navigateToUrl).toHaveBeenCalledWith('/server-base-path/s/space-1/spaces/enter');
    });
  });

  it('displays loading state while spaces are being fetched', () => {
    spacesManager.getSpaces.mockImplementation(() => new Promise(() => {}));

    const activeSpace = mockSpaces[0];
    renderNavControlPopover({}, activeSpace);

    fireEvent.click(screen.getByTestId('spacesNavSelector'));

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('closes the popover when clicking the button again', async () => {
    const activeSpace = mockSpaces[0];
    renderNavControlPopover({}, activeSpace);

    fireEvent.click(screen.getByTestId('spacesNavSelector'));

    await waitFor(() => {
      expect(screen.getByTestId('spaceMenuPopoverPanel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('spacesNavSelector'));

    await waitFor(() => {
      expect(screen.queryByTestId('spaceMenuPopoverPanel')).not.toBeInTheDocument();
    });
  });

  it('calls navigateToApp when manage spaces button is clicked', async () => {
    const navigateToApp = jest.fn();
    const activeSpace = mockSpaces[0];

    renderNavControlPopover({ navigateToApp }, activeSpace);

    fireEvent.click(screen.getByTestId('spacesNavSelector'));

    await waitFor(() => {
      expect(screen.getByTestId('spaceMenuPopoverPanel')).toBeInTheDocument();
    });

    const manageButton = screen.getByTestId('manageSpaces');
    fireEvent.click(manageButton);

    expect(navigateToApp).toHaveBeenCalledWith('management', { path: 'kibana/spaces' });
  });
});
