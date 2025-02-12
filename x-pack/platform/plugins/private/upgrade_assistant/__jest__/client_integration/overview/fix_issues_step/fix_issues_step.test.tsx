/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from '@kbn/core/public/mocks';

import { setupEnvironment } from '../../helpers';
import { kibanaDeprecationsServiceHelpers } from '../../kibana_deprecations/service.mock';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';
import { esCriticalAndWarningDeprecations, esNoDeprecations } from './mock_es_issues';

describe('Overview - Fix deprecation issues step', () => {
  let testBed: OverviewTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('when there are critical issues in one panel', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esCriticalAndWarningDeprecations);

      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService, response: [] });

        testBed = await setupOverviewPage(httpSetup, {
          services: {
            core: {
              deprecations: deprecationService,
            },
          },
        });
      });

      testBed.component.update();
    });

    test('renders step as incomplete', async () => {
      const { exists } = testBed;
      expect(exists(`fixIssuesStep-incomplete`)).toBe(true);
    });
  });

  describe('when there are no critical issues for either panel', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esNoDeprecations);

      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService, response: [] });

        testBed = await setupOverviewPage(httpSetup, {
          services: {
            core: {
              deprecations: deprecationService,
            },
          },
        });
      });

      testBed.component.update();
    });

    test('renders step as complete', async () => {
      const { exists } = testBed;
      expect(exists(`fixIssuesStep-complete`)).toBe(true);
    });
  });
});
