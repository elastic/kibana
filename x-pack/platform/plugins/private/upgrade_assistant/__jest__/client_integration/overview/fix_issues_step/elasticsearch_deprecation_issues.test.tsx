/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deprecationsServiceMock } from '@kbn/core/public/mocks';
import { screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { setupEnvironment } from '../../helpers/setup_environment';
import { kibanaDeprecationsServiceHelpers } from '../../kibana_deprecations/service.mock';
import { setupOverviewPage } from '../overview.helpers';
import {
  esCriticalAndWarningDeprecations,
  esCriticalOnlyDeprecations,
  esNoDeprecations,
} from './mock_es_issues';

describe('Overview - Fix deprecation issues step - Elasticsearch deprecations', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('When load succeeds', () => {
    const setup = async () => {
      // Set up with no Kibana deprecations.
      const deprecationService = deprecationsServiceMock.createStartContract();
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService, response: [] });

      await setupOverviewPage(httpSetup, {
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });

      await screen.findByTestId('esStatsPanel');
    };

    describe('when there are critical and warning issues', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esCriticalAndWarningDeprecations);
        await setup();
      });

      test('renders counts for both', () => {
        const panel = screen.getByTestId('esStatsPanel');
        expect(panel).toBeInTheDocument();
        expect(within(panel).getByTestId('warningDeprecations')).toHaveTextContent('1');
        expect(within(panel).getByTestId('criticalDeprecations')).toHaveTextContent('1');
      });

      test('panel links to ES deprecations page', () => {
        const panel = screen.getByTestId('esStatsPanel');
        const link = panel.querySelector('a');
        expect(link).not.toBeNull();
        expect(link?.getAttribute('href')).toBe('/es_deprecations');
      });
    });

    describe('when there are critical but no warning issues', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esCriticalOnlyDeprecations);
        await setup();
      });

      test('renders a count for critical issues', () => {
        const panel = screen.getByTestId('esStatsPanel');
        expect(panel).toBeInTheDocument();
        expect(within(panel).getByTestId('criticalDeprecations')).toHaveTextContent('1');
        expect(within(panel).queryByTestId('warningDeprecations')).not.toBeInTheDocument();
      });

      test('panel links to ES deprecations page', () => {
        const panel = screen.getByTestId('esStatsPanel');
        const link = panel.querySelector('a');
        expect(link).not.toBeNull();
        expect(link?.getAttribute('href')).toBe('/es_deprecations');
      });
    });

    describe('when there no critical or warning issues', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esNoDeprecations);
        await setup();
      });

      test('renders a success state', () => {
        const panel = screen.getByTestId('esStatsPanel');
        expect(panel).toBeInTheDocument();
        expect(within(panel).getByTestId('noDeprecationIssues')).toBeInTheDocument();
      });

      test(`panel doesn't link to ES deprecations page`, () => {
        const panel = screen.getByTestId('esStatsPanel');
        expect(panel.querySelector('a')).toBeNull();
      });
    });
  });

  describe(`When there's a load error`, () => {
    test('handles network failure', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await setupOverviewPage(httpSetup);

      const panel = await screen.findByTestId('esStatsPanel');
      expect(within(panel).getByTestId('loadingIssuesError')).toHaveTextContent(
        'Could not retrieve Elasticsearch deprecation issues.'
      );
    });

    test('handles unauthorized error', async () => {
      const error = {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Forbidden',
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await setupOverviewPage(httpSetup);

      const panel = await screen.findByTestId('esStatsPanel');
      expect(within(panel).getByTestId('loadingIssuesError')).toHaveTextContent(
        'You are not authorized to view Elasticsearch deprecation issues.'
      );
    });

    test('handles partially upgraded error', async () => {
      const error = {
        statusCode: 426,
        error: 'Upgrade required',
        message: 'There are some nodes running a different version of Elasticsearch',
        attributes: {
          allNodesUpgraded: false,
        },
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await setupOverviewPage(httpSetup);

      const panel = await screen.findByTestId('esStatsPanel');
      expect(within(panel).getByTestId('loadingIssuesError')).toHaveTextContent(
        'Upgrade Kibana to the same version as your Elasticsearch cluster. One or more nodes in the cluster is running a different version than Kibana.'
      );
    });

    test('handles upgrade error', async () => {
      const error = {
        statusCode: 426,
        error: 'Upgrade required',
        message: 'There are some nodes running a different version of Elasticsearch',
        attributes: {
          allNodesUpgraded: true,
        },
      };

      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

      await setupOverviewPage(httpSetup);

      const panel = await screen.findByTestId('esStatsPanel');
      expect(within(panel).getByTestId('loadingIssuesError')).toHaveTextContent(
        'All Elasticsearch nodes have been upgraded.'
      );
    });
  });
});
