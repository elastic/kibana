/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { spaceTest } from '../fixtures';
import { BREADCRUMBS, INFERENCE_PAGES } from '../fixtures/constants';
import { eisEndpointsMockData } from '../fixtures/mock_data/eis_endpoints';
import { externalInferenceEndpointsMockData } from '../fixtures/mock_data/external_inference_endpoints';
import { mockInferenceEndpoints, unmockInferenceEndpoints } from '../fixtures/mocks';

spaceTest.describe(
  'Inference Navigation - Search Solution Space',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.setSolutionView('es');
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterEach(async ({ page }) => {
      await unmockInferenceEndpoints(page);
    });

    spaceTest(
      'EIS Models Page: displays correct navigation in search solution',
      async ({ page, pageObjects }) => {
        await mockInferenceEndpoints(page, eisEndpointsMockData);
        await pageObjects.eisModels.goto();

        await pageObjects.navigation.expectInferencePage({
          pageHeader: pageObjects.eisModels.pageHeader,
          urlPath: INFERENCE_PAGES.eisModels.urlPath,
          classicBreadcrumbs: [...BREADCRUMBS.stateful.searchSolution, 'Elastic Inference'],
          isNextChrome: await pageObjects.chrome.isNextChrome(),
        });
      }
    );

    spaceTest(
      'External Inference Page: displays correct navigation in search solution',
      async ({ page, pageObjects }) => {
        await mockInferenceEndpoints(page, externalInferenceEndpointsMockData);
        await pageObjects.externalInference.goto();

        await pageObjects.navigation.expectInferencePage({
          pageHeader: pageObjects.externalInference.pageHeader,
          urlPath: INFERENCE_PAGES.externalInference.urlPath,
          classicBreadcrumbs: [...BREADCRUMBS.stateful.searchSolution, 'External Inference'],
          isNextChrome: await pageObjects.chrome.isNextChrome(),
        });
      }
    );

    spaceTest(
      'Feature Settings Page: displays correct navigation in search solution',
      async ({ page, pageObjects }) => {
        await mockInferenceEndpoints(page, eisEndpointsMockData);
        await pageObjects.featureSettings.goto();

        await pageObjects.navigation.expectInferencePage({
          pageHeader: pageObjects.featureSettings.pageHeader,
          urlPath: INFERENCE_PAGES.featureSettings.urlPath,
          classicBreadcrumbs: [...BREADCRUMBS.stateful.searchSolution, 'Feature Settings'],
          isNextChrome: await pageObjects.chrome.isNextChrome(),
        });
      }
    );
  }
);
