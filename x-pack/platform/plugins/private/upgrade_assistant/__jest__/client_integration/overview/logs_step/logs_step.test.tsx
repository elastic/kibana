/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEPRECATION_LOGS_INDEX,
  APP_LOGS_COUNT_CLUSTER_PRIVILEGES,
  DEPRECATION_LOGS_ORIGIN_FIELD,
  APPS_WITH_DEPRECATION_LOGS,
} from '../../../../common/constants';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { setupEnvironment } from '../../helpers/setup_environment';
import { setupOverviewPage } from '../overview.helpers';

describe('Overview - Logs Step', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('error state', () => {
    beforeEach(async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse(undefined, error);
      httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({
        isDeprecationLogIndexingEnabled: true,
        isDeprecationLoggingEnabled: true,
      });

      await setupOverviewPage(httpSetup);
    });

    test('is rendered and allows retry', async () => {
      expect(screen.getByTestId('deprecationLogsErrorCallout')).toBeInTheDocument();
      expect(screen.getByTestId('deprecationLogsRetryButton')).toBeInTheDocument();

      expect(screen.queryByTestId('logsCountDescription')).not.toBeInTheDocument();
      expect(screen.queryByTestId('viewDiscoverLogsButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('viewDetailsLink')).not.toBeInTheDocument();

      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
        count: 10,
      });

      fireEvent.click(screen.getByTestId('deprecationLogsRetryButton'));

      await waitFor(() => {
        expect(screen.getByTestId('logsCountDescription')).toBeInTheDocument();
      });
      expect(screen.getByTestId('viewDiscoverLogsButton')).toBeInTheDocument();
      expect(screen.getByTestId('viewDetailsLink')).toBeInTheDocument();

      expect(screen.queryByTestId('deprecationLogsErrorCallout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('deprecationLogsRetryButton')).not.toBeInTheDocument();
    });
  });

  describe('success state', () => {
    describe('logging enabled', () => {
      beforeEach(() => {
        httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({
          isDeprecationLogIndexingEnabled: true,
          isDeprecationLoggingEnabled: true,
        });
      });

      test('renders step as complete when a user has 0 logs', async () => {
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 0,
        });

        await setupOverviewPage(httpSetup);
        expect(screen.getByTestId('logsStep-complete')).toBeInTheDocument();
      });

      test('renders step as incomplete when a user has >0 logs', async () => {
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 10,
        });

        await setupOverviewPage(httpSetup);
        expect(screen.getByTestId('logsStep-incomplete')).toBeInTheDocument();
      });

      test('renders deprecation issue count and button to view logs', async () => {
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 10,
        });

        await setupOverviewPage(httpSetup);
        expect(screen.getByTestId('logsCountDescription')).toHaveTextContent(
          'You have 10 deprecation issues'
        );
      });

      test('displays discover and verify changes buttons', async () => {
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 10,
        });

        await setupOverviewPage(httpSetup);

        const discoverButton = await screen.findByTestId('viewDiscoverLogsButton');
        const viewDetailsLink = await screen.findByTestId('viewDetailsLink');

        expect(discoverButton).toBeInTheDocument();
        expect(viewDetailsLink).toBeInTheDocument();
        expect(discoverButton).toHaveTextContent('Analyze logs in Discover');
        expect(viewDetailsLink).toHaveTextContent('View details');
        expect(screen.queryByTestId('enableLogsLink')).not.toBeInTheDocument();
      });

      test('has a link to see logs in discover app', async () => {
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 10,
        });

        await setupOverviewPage(httpSetup);

        const discoverButton = await screen.findByTestId('viewDiscoverLogsButton');
        expect(discoverButton).toBeInTheDocument();

        const href = (discoverButton as HTMLAnchorElement).getAttribute('href');
        const decodedUrl = decodeURIComponent(href ?? '');
        expect(decodedUrl).toContain('discoverUrl');
        [
          '"language":"kuery"',
          '"query":"@timestamp+>',
          'filters=',
          DEPRECATION_LOGS_ORIGIN_FIELD,
          ...APPS_WITH_DEPRECATION_LOGS,
        ].forEach((param) => {
          try {
            expect(decodedUrl).toContain(param);
          } catch (e) {
            throw new Error(`Expected [${param}] not found in ${decodedUrl}`);
          }
        });
      });
    });

    describe('logging disabled', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({
          isDeprecationLogIndexingEnabled: false,
          isDeprecationLoggingEnabled: true,
        });

        await setupOverviewPage(httpSetup);
      });

      test('renders button to enable logs', () => {
        expect(screen.queryByTestId('logsCountDescription')).not.toBeInTheDocument();
        expect(screen.getByTestId('enableLogsLink')).toHaveTextContent('Enable logging');
        expect(screen.queryByTestId('viewDiscoverLogsButton')).not.toBeInTheDocument();
        expect(screen.queryByTestId('viewDetailsLink')).not.toBeInTheDocument();
      });
    });
  });

  describe('privileges', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({
        isDeprecationLogIndexingEnabled: true,
        isDeprecationLoggingEnabled: true,
      });
    });

    test('warns the user of missing index privileges', async () => {
      await setupOverviewPage(httpSetup, {
        privileges: {
          hasAllPrivileges: true,
          missingPrivileges: {
            cluster: [],
            index: [DEPRECATION_LOGS_INDEX],
          },
        },
      });
      expect(screen.getByTestId('missingIndexPrivilegesCallout')).toBeInTheDocument();
    });

    test('warns the user of missing cluster privileges', async () => {
      await setupOverviewPage(httpSetup, {
        privileges: {
          hasAllPrivileges: true,
          missingPrivileges: {
            cluster: [...APP_LOGS_COUNT_CLUSTER_PRIVILEGES],
            index: [],
          },
        },
      });
      expect(screen.getByTestId('missingClusterPrivilegesCallout')).toBeInTheDocument();
    });
  });
});
