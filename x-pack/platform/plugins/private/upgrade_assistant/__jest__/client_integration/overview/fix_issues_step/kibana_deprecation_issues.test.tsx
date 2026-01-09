/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deprecationsServiceMock } from '@kbn/core/public/mocks';
import type { DomainDeprecationDetails } from '@kbn/core/public';
import { screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { setupEnvironment } from '../../helpers/setup_environment';
import { kibanaDeprecationsServiceHelpers } from '../../kibana_deprecations/service.mock';
import { setupOverviewPage } from '../overview.helpers';
import { esNoDeprecations } from './mock_es_issues';

describe('Overview - Fix deprecation issues step - Kibana deprecations', () => {
  const { mockedKibanaDeprecations, mockedCriticalKibanaDeprecations } =
    kibanaDeprecationsServiceHelpers.defaultMockedResponses;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('When load succeeds', () => {
    const setup = async (response: DomainDeprecationDetails[]) => {
      // Set up with no ES deprecations.
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esNoDeprecations);

      const deprecationService = deprecationsServiceMock.createStartContract();
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService, response });

      await setupOverviewPage(httpSetup, {
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });

      await screen.findByTestId('kibanaStatsPanel');
    };

    describe('when there are critical and warning issues', () => {
      beforeEach(async () => {
        await setup(mockedKibanaDeprecations);
      });

      test('renders counts for both', () => {
        const panel = screen.getByTestId('kibanaStatsPanel');
        expect(panel).toBeInTheDocument();
        expect(within(panel).getByTestId('criticalDeprecations')).toHaveTextContent('1');
        expect(within(panel).getByTestId('warningDeprecations')).toHaveTextContent('2');
      });

      test('panel links to Kibana deprecations page', () => {
        const panel = screen.getByTestId('kibanaStatsPanel');
        const link = panel.querySelector('a');
        expect(link).not.toBeNull();
        expect(link?.getAttribute('href')).toBe('/kibana_deprecations');
      });
    });

    describe('when there are critical but no warning issues', () => {
      beforeEach(async () => {
        await setup(mockedCriticalKibanaDeprecations);
      });

      test('renders a count for critical issues', () => {
        const panel = screen.getByTestId('kibanaStatsPanel');
        expect(panel).toBeInTheDocument();
        expect(within(panel).getByTestId('criticalDeprecations')).toHaveTextContent('1');
        expect(within(panel).queryByTestId('warningDeprecations')).not.toBeInTheDocument();
      });

      test('panel links to Kibana deprecations page', () => {
        const panel = screen.getByTestId('kibanaStatsPanel');
        const link = panel.querySelector('a');
        expect(link).not.toBeNull();
        expect(link?.getAttribute('href')).toBe('/kibana_deprecations');
      });
    });

    describe('when there no critical or warning issues', () => {
      beforeEach(async () => {
        await setup([]);
      });

      test('renders a success state for the panel', () => {
        const panel = screen.getByTestId('kibanaStatsPanel');
        expect(panel).toBeInTheDocument();
        expect(within(panel).getByTestId('noDeprecationIssues')).toBeInTheDocument();
      });

      test(`panel doesn't link to Kibana deprecations page`, () => {
        const panel = screen.getByTestId('kibanaStatsPanel');
        expect(panel.querySelector('a')).toBeNull();
      });
    });
  });

  describe(`When there's a load error`, () => {
    test('Handles network failure', async () => {
      const deprecationService = deprecationsServiceMock.createStartContract();
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({
        deprecationService,
        mockRequestErrorMessage: 'Internal Server Error',
      });

      await setupOverviewPage(httpSetup, {
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });

      const panel = await screen.findByTestId('kibanaStatsPanel');
      expect(within(panel).getByTestId('loadingIssuesError')).toHaveTextContent(
        'Could not retrieve Kibana deprecation issues.'
      );
    });
  });
});
