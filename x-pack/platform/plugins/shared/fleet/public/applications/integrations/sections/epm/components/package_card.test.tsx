/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../mock';

import { useStartServices } from '../../../hooks';

import type { PackageCardProps } from './package_card';
import { PackageCard } from './package_card';
import { getLineClampStyles, shouldShowInstallationStatus } from './installation_status';

jest.mock('../../../hooks', () => {
  return {
    ...jest.requireActual('../../../hooks'),
    useConfirmForceInstall: jest.fn(),
    useStartServices: jest.fn().mockReturnValue({
      application: {
        navigateToApp: jest.fn(),
        navigateToUrl: jest.fn(),
      },
    }),
    useIsGuidedOnboardingActive: jest.fn().mockReturnValue(false),
  };
});

jest.mock('../../../components', () => {
  return {
    ...jest.requireActual('../../../components'),
    WithGuidedOnboardingTour: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
  };
});

jest.mock('./installation_status', () => {
  return {
    shouldShowInstallationStatus: jest.fn(),
    getLineClampStyles: jest.fn(),
    InstallationStatus: () => {
      return <div data-test-subj="installation-status" />;
    },
  };
});

function cardProps(overrides: Partial<PackageCardProps> = {}): PackageCardProps {
  return {
    id: 'card-1',
    url: 'https://google.com',
    fromIntegrations: 'installed',
    title: 'System',
    description: 'System',
    ...overrides,
  } as PackageCardProps;
}

function renderPackageCard(props: PackageCardProps) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(<PackageCard {...props} />);

  return { utils };
}

// FLAKY: https://github.com/elastic/kibana/issues/200848
describe.skip('package card', () => {
  let mockNavigateToApp: jest.Mock;
  let mockNavigateToUrl: jest.Mock;
  const mockGetLineClamp = getLineClampStyles as jest.Mock;
  const mockShouldShowInstallationStatus = shouldShowInstallationStatus as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigateToApp = useStartServices().application.navigateToApp as jest.Mock;
    mockNavigateToUrl = useStartServices().application.navigateToUrl as jest.Mock;
  });

  it('should navigate with state when integrations card', async () => {
    const { utils } = renderPackageCard(
      cardProps({
        url: '/app/integrations/detail/apache-1.0/overview',
      })
    );

    await act(async () => {
      const el = utils.getByRole('button');
      fireEvent.click(el!, {});
    });
    expect(mockNavigateToApp).toHaveBeenCalledWith('integrations', {
      path: '/detail/apache-1.0/overview',
      state: { fromIntegrations: 'installed' },
    });
  });

  it('should navigate with url when enterprise search card', async () => {
    const { utils } = renderPackageCard(
      cardProps({
        url: '/app/enterprise_search/workplace_search/setup_guide',
      })
    );

    await act(async () => {
      const el = utils.getByRole('button');
      fireEvent.click(el!, {});
    });
    expect(mockNavigateToUrl).toHaveBeenCalledWith(
      '/app/enterprise_search/workplace_search/setup_guide'
    );
  });

  it('should navigate with window open when external url', async () => {
    window.open = jest.fn();

    const { utils } = renderPackageCard(cardProps());

    await act(async () => {
      const el = utils.getByRole('button');
      fireEvent.click(el!, {});
    });
    expect(window.open).toHaveBeenCalledWith('https://google.com', '_blank');
  });

  it.each([true, false])(
    'determines whether to render card with badge when quickstart flag is %s',
    async (isQuickstart) => {
      const {
        utils: { queryByTitle },
      } = renderPackageCard(
        cardProps({
          isQuickstart,
        })
      );
      const badgeElement = await queryByTitle('Quickstart');
      expect(!!badgeElement).toEqual(isQuickstart);
    }
  );

  it.each([true, false])(
    'determines whether to render card with collection button when `isCollectionCard` is %s`',
    async (isCollectionCard) => {
      const {
        utils: { queryByText },
      } = renderPackageCard(cardProps({ isCollectionCard }));
      const collectionButton = queryByText('View collection');
      expect(!!collectionButton).toEqual(isCollectionCard);
    }
  );

  describe('Installation status', () => {
    it('should render installation status when showInstallationStatus is true', async () => {
      const {
        utils: { queryByTestId },
      } = renderPackageCard(
        cardProps({
          showInstallationStatus: true,
        })
      );
      const installationStatus = queryByTestId('installation-status');
      expect(installationStatus).toBeInTheDocument();
    });

    it('should render max-height when maxCardHeight is provided', async () => {
      const {
        utils: { queryByTestId },
      } = renderPackageCard(
        cardProps({
          maxCardHeight: 150,
        })
      );
      const card = queryByTestId(`integration-card:card-1`);
      expect(card).toHaveStyle('max-height: 150px');
    });

    it('should render 1 line of description when descriptionLineClamp is provided and shouldShowInstallationStatus returns true', async () => {
      mockShouldShowInstallationStatus.mockReturnValue(true);
      renderPackageCard(
        cardProps({
          showInstallationStatus: true,
          installStatus: 'installed',
          descriptionLineClamp: 3,
        })
      );
      expect(mockShouldShowInstallationStatus).toHaveBeenCalledWith({
        installStatus: 'installed',
        showInstallationStatus: true,
      });
      expect(mockGetLineClamp).toHaveBeenCalledWith(1);
    });

    it('should render specific lines of description when descriptionLineClamp is provided and shouldShowInstallationStatus returns false', async () => {
      mockShouldShowInstallationStatus.mockReturnValue(false);
      renderPackageCard(
        cardProps({
          showInstallationStatus: false,
          installStatus: 'installed',
          descriptionLineClamp: 3,
        })
      );
      expect(mockShouldShowInstallationStatus).toHaveBeenCalledWith({
        installStatus: 'installed',
        showInstallationStatus: false,
      });
      expect(mockGetLineClamp).toHaveBeenCalledWith(3);
    });

    it('should not render line clamp when descriptionLineClamp is not provided', async () => {
      mockShouldShowInstallationStatus.mockReturnValue(false);
      renderPackageCard(
        cardProps({
          showInstallationStatus: true,
          installStatus: 'installed',
        })
      );
      expect(mockShouldShowInstallationStatus).not.toHaveBeenCalled();
    });

    it('should render specific lines of title when titleLineClamp is provided and shouldShowInstallationStatus returns false', async () => {
      mockShouldShowInstallationStatus.mockReturnValue(false);
      renderPackageCard(
        cardProps({
          titleLineClamp: 1,
        })
      );
      expect(mockGetLineClamp).toHaveBeenCalledWith(1);
    });
  });
});
