/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';

import { setupEnvironment } from '../helpers/setup_environment';
import { setupAppPage } from './app.helpers';

describe('Cluster upgrade', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('when user is still preparing for upgrade', () => {
    test('renders overview', async () => {
      await setupAppPage(httpSetup);

      expect(screen.getByTestId('overviewPageHeader')).toBeInTheDocument();
      expect(screen.queryByTestId('isUpgradingMessage')).toBeNull();
      expect(screen.queryByTestId('isUpgradeCompleteMessage')).toBeNull();
    });
  });

  // The way we detect if we are currently upgrading or if the upgrade has been completed is if
  // we ever get back a 426 error in *any* API response that UA makes. For that reason we can
  // just mock one of the APIs that are being called from the overview page to return an error
  // in order to trigger these interstitial states. In this case we're going to mock the
  // `es deprecations` response.
  describe('when cluster is in the process of a rolling upgrade', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, {
        statusCode: 426,
        message: '',
        attributes: {
          allNodesUpgraded: false,
        },
      });

      await setupAppPage(httpSetup);
    });

    test('renders rolling upgrade message', async () => {
      await screen.findByTestId('isUpgradingMessage');
      await waitFor(() => {
        expect(screen.queryByTestId('overviewPageHeader')).toBeNull();
      });
      expect(screen.queryByTestId('isUpgradeCompleteMessage')).toBeNull();
    });
  });

  describe('when cluster has been upgraded', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, {
        statusCode: 426,
        message: '',
        attributes: {
          allNodesUpgraded: true,
        },
      });

      await setupAppPage(httpSetup);
    });

    test('renders upgrade complete message', async () => {
      await screen.findByTestId('isUpgradeCompleteMessage');
      await waitFor(() => {
        expect(screen.queryByTestId('overviewPageHeader')).toBeNull();
      });
      expect(screen.queryByTestId('isUpgradingMessage')).toBeNull();
    });
  });
});
