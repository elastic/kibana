/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deprecationsServiceMock } from '@kbn/core/public/mocks';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { setupEnvironment } from '../../helpers/setup_environment';
import { kibanaDeprecationsServiceHelpers } from '../../kibana_deprecations/service.mock';
import { setupOverviewPage } from '../overview.helpers';
import { esCriticalAndWarningDeprecations, esNoDeprecations } from './mock_es_issues';

describe('Overview - Fix deprecation issues step', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('when there are critical issues in one panel', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esCriticalAndWarningDeprecations);

      const deprecationService = deprecationsServiceMock.createStartContract();
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService, response: [] });

      await setupOverviewPage(httpSetup, {
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });
    });

    test('renders step as incomplete', async () => {
      expect(await screen.findByTestId('fixIssuesStep-incomplete')).toBeInTheDocument();
    });
  });

  describe('when there are no critical issues for either panel', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esNoDeprecations);

      const deprecationService = deprecationsServiceMock.createStartContract();
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService, response: [] });

      await setupOverviewPage(httpSetup, {
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });
    });

    test('renders step as complete', async () => {
      expect(await screen.findByTestId('fixIssuesStep-complete')).toBeInTheDocument();
    });
  });
});
