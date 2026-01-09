/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { setupEnvironment } from '../../helpers/setup_environment';
import { setupOverviewPage } from '../overview.helpers';

const DEPLOYMENT_URL = 'https://cloud.elastic.co./deployments/bfdad4ef99a24212a06d387593686d63';

describe('Overview - Upgrade Step', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let setDelayResponse: ReturnType<typeof setupEnvironment>['setDelayResponse'];
  const setupCloudOverviewPage = () => {
    return setupOverviewPage(httpSetup, {
      plugins: {
        cloud: {
          isCloudEnabled: true,
          deploymentUrl: DEPLOYMENT_URL,
        },
      },
    });
  };

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
    setDelayResponse = mockEnvironment.setDelayResponse;
  });

  describe('On-prem', () => {
    test('Shows link to setup upgrade docs', async () => {
      await setupOverviewPage(httpSetup);
      expect(screen.getByTestId('upgradeSetupDocsLink')).toBeInTheDocument();
      expect(screen.queryByTestId('upgradeSetupCloudLink')).not.toBeInTheDocument();
    });
  });

  describe('On Cloud', () => {
    test('When ready for upgrade, shows upgrade CTA and link to docs', async () => {
      httpRequestsMockHelpers.setGetUpgradeStatusResponse({
        readyForUpgrade: true,
        details: 'Ready for upgrade',
      });

      await setupCloudOverviewPage();

      expect(screen.getByTestId('upgradeSetupDocsLink')).toBeInTheDocument();
      const cloudLink = screen.getByTestId('upgradeSetupCloudLink');
      expect(cloudLink).toBeInTheDocument();
      expect(cloudLink.getAttribute('href')).toBe(`${DEPLOYMENT_URL}?show_upgrade=true`);
    });

    test('When not ready for upgrade, the CTA button is disabled', async () => {
      httpRequestsMockHelpers.setGetUpgradeStatusResponse({
        readyForUpgrade: false,
        details: 'Resolve critical deprecations first',
      });

      await setupCloudOverviewPage();

      expect(screen.getByTestId('upgradeSetupDocsLink')).toBeInTheDocument();
      const cloudLink = screen.getByTestId('upgradeSetupCloudLink');
      expect(cloudLink).toBeInTheDocument();
      expect(cloudLink).toBeDisabled();
    });

    test('An error callout is displayed, if status check failed', async () => {
      httpRequestsMockHelpers.setGetUpgradeStatusResponse(undefined, {
        statusCode: 500,
        message: 'Status check failed',
      });

      await setupCloudOverviewPage();

      expect(screen.queryByTestId('upgradeSetupDocsLink')).not.toBeInTheDocument();
      expect(screen.queryByTestId('upgradeSetupCloudLink')).not.toBeInTheDocument();
      expect(screen.getByTestId('upgradeStatusErrorCallout')).toBeInTheDocument();
    });

    test('The CTA button displays loading indicator', async () => {
      setDelayResponse(true);
      await setupCloudOverviewPage();

      expect(screen.getByTestId('upgradeSetupDocsLink')).toBeInTheDocument();
      expect(screen.getByTestId('upgradeSetupCloudLink')).toHaveTextContent(
        'Loading upgrade status'
      );
    });
  });
});
