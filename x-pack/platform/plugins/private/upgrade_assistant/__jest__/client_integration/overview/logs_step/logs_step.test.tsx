/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import {
  DEPRECATION_LOGS_INDEX,
  APP_LOGS_COUNT_CLUSTER_PRIVILEGES,
  DEPRECATION_LOGS_ORIGIN_FIELD,
  APPS_WITH_DEPRECATION_LOGS,
} from '../../../../common/constants';
import { setupEnvironment } from '../../helpers';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';

describe('Overview - Logs Step', () => {
  let testBed: OverviewTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
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

      await act(async () => {
        testBed = await setupOverviewPage(httpSetup);
      });

      testBed.component.update();
    });

    test('is rendered and allows retry', async () => {
      const { exists, actions } = testBed;
      expect(exists('deprecationLogsErrorCallout')).toBe(true);
      expect(exists('deprecationLogsRetryButton')).toBe(true);

      expect(exists('logsCountDescription')).toBe(false);
      expect(exists('viewDiscoverLogsButton')).toBe(false);
      expect(exists('viewDetailsLink')).toBe(false);

      httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
        count: 10,
      });

      await actions.clickRetryLogsButton();

      expect(exists('logsCountDescription')).toBe(true);
      expect(exists('viewDiscoverLogsButton')).toBe(true);
      expect(exists('viewDetailsLink')).toBe(true);

      expect(exists('deprecationLogsErrorCallout')).toBe(false);
      expect(exists('deprecationLogsRetryButton')).toBe(false);
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

        await act(async () => {
          testBed = await setupOverviewPage(httpSetup);
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('logsStep-complete')).toBe(true);
      });

      test('renders step as incomplete when a user has >0 logs', async () => {
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 10,
        });

        await act(async () => {
          testBed = await setupOverviewPage(httpSetup);
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('logsStep-incomplete')).toBe(true);
      });

      test('renders deprecation issue count and button to view logs', async () => {
        httpRequestsMockHelpers.setLoadDeprecationLogsCountResponse({
          count: 10,
        });

        await act(async () => {
          testBed = await setupOverviewPage(httpSetup);
        });

        const { component, find } = testBed;

        component.update();

        expect(find('logsCountDescription').text()).toContain('You have 10 deprecation issues');
      });

      test('displays discover and verify changes buttons', async () => {
        const { exists, find } = testBed;
        expect(exists('viewDiscoverLogsButton')).toBe(true);
        expect(exists('viewDetailsLink')).toBe(true);
        expect(find('viewDiscoverLogsButton').text()).toContain('Analyze logs in Discover');
        expect(find('viewDetailsLink').text()).toContain('View details');
        expect(exists('enableLogsLink')).toBe(false);
      });

      test('has a link to see logs in discover app', async () => {
        const { exists, find } = testBed;

        expect(exists('viewDiscoverLogsButton')).toBe(true);

        const decodedUrl = decodeURIComponent(find('viewDiscoverLogsButton').props().href);
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

        await act(async () => {
          testBed = await setupOverviewPage(httpSetup);
        });

        const { component } = testBed;

        component.update();
      });

      test('renders button to enable logs', () => {
        const { find, exists } = testBed;

        expect(exists('logsCountDescription')).toBe(false);
        expect(find('enableLogsLink').text()).toContain('Enable logging');
        expect(exists('viewDiscoverLogsButton')).toBe(false);
        expect(exists('viewDetailsLink')).toBe(false);
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
      await act(async () => {
        testBed = await setupOverviewPage(httpSetup, {
          privileges: {
            hasAllPrivileges: true,
            missingPrivileges: {
              cluster: [],
              index: [DEPRECATION_LOGS_INDEX],
            },
          },
        });
      });

      const { component, exists } = testBed;
      component.update();

      expect(exists('missingIndexPrivilegesCallout')).toBe(true);
    });

    test('warns the user of missing cluster privileges', async () => {
      await act(async () => {
        testBed = await setupOverviewPage(httpSetup, {
          privileges: {
            hasAllPrivileges: true,
            missingPrivileges: {
              cluster: [...APP_LOGS_COUNT_CLUSTER_PRIVILEGES],
              index: [],
            },
          },
        });
      });

      const { component, exists } = testBed;
      component.update();

      expect(exists('missingClusterPrivilegesCallout')).toBe(true);
    });
  });
});
