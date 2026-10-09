/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { test } from '../fixtures';
import { BREADCRUMBS, INFERENCE_PAGES } from '../fixtures/constants';
import { eisEndpointsMockData } from '../fixtures/mock_data/eis_endpoints';
import { externalInferenceEndpointsMockData } from '../fixtures/mock_data/external_inference_endpoints';
import { mockInferenceEndpoints, unmockInferenceEndpoints } from '../fixtures/mocks';

test.describe('Inference Navigation', () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterEach(async ({ page }) => {
    await unmockInferenceEndpoints(page);
  });

  test(
    'EIS Models Page: displays correct breadcrumbs in classic navigation',
    { tag: [...tags.stateful.classic] },
    async ({ page, pageObjects }) => {
      await mockInferenceEndpoints(page, eisEndpointsMockData);
      await pageObjects.eisModels.goto();

      await pageObjects.navigation.expectInferencePage({
        pageHeader: pageObjects.eisModels.pageHeader,
        urlPath: INFERENCE_PAGES.eisModels.urlPath,
        classicBreadcrumbs: [...BREADCRUMBS.stateful.classic, 'Elastic Inference'],
        isNextChrome: await pageObjects.chrome.isNextChrome(),
      });
    }
  );

  test(
    'EIS Models Page: displays correct navigation in serverless search',
    { tag: [...tags.serverless.search] },
    async ({ page, pageObjects }) => {
      await mockInferenceEndpoints(page, eisEndpointsMockData);
      await pageObjects.eisModels.goto();

      await pageObjects.navigation.expectInferencePage({
        pageHeader: pageObjects.eisModels.pageHeader,
        urlPath: INFERENCE_PAGES.eisModels.urlPath,
        classicBreadcrumbs: [...BREADCRUMBS.serverless.search, 'Elastic Inference'],
        isNextChrome: await pageObjects.chrome.isNextChrome(),
        isServerless: true,
      });
    }
  );

  test(
    'External Inference Page: displays correct breadcrumbs in classic navigation',
    { tag: [...tags.stateful.classic] },
    async ({ page, pageObjects }) => {
      await mockInferenceEndpoints(page, externalInferenceEndpointsMockData);
      await pageObjects.externalInference.goto();

      await pageObjects.navigation.expectInferencePage({
        pageHeader: pageObjects.externalInference.pageHeader,
        urlPath: INFERENCE_PAGES.externalInference.urlPath,
        classicBreadcrumbs: [...BREADCRUMBS.stateful.classic, 'External Inference'],
        isNextChrome: await pageObjects.chrome.isNextChrome(),
      });
    }
  );

  test(
    'External Inference Page: displays correct navigation in serverless search',
    { tag: [...tags.serverless.search] },
    async ({ page, pageObjects }) => {
      await mockInferenceEndpoints(page, externalInferenceEndpointsMockData);
      await pageObjects.externalInference.goto();

      await pageObjects.navigation.expectInferencePage({
        pageHeader: pageObjects.externalInference.pageHeader,
        urlPath: INFERENCE_PAGES.externalInference.urlPath,
        classicBreadcrumbs: [...BREADCRUMBS.serverless.search, 'External Inference'],
        isNextChrome: await pageObjects.chrome.isNextChrome(),
        isServerless: true,
      });
    }
  );

  test(
    'Feature Settings Page: displays correct breadcrumbs in classic navigation',
    { tag: [...tags.stateful.classic] },
    async ({ page, pageObjects }) => {
      await mockInferenceEndpoints(page, eisEndpointsMockData);
      await pageObjects.featureSettings.goto();

      await pageObjects.navigation.expectInferencePage({
        pageHeader: pageObjects.featureSettings.pageHeader,
        urlPath: INFERENCE_PAGES.featureSettings.urlPath,
        classicBreadcrumbs: [...BREADCRUMBS.stateful.classic, 'Feature Settings'],
        isNextChrome: await pageObjects.chrome.isNextChrome(),
      });
    }
  );

  test(
    'Feature Settings Page: displays correct navigation in serverless search',
    { tag: [...tags.serverless.search] },
    async ({ page, pageObjects }) => {
      await mockInferenceEndpoints(page, eisEndpointsMockData);
      await pageObjects.featureSettings.goto();

      await pageObjects.navigation.expectInferencePage({
        pageHeader: pageObjects.featureSettings.pageHeader,
        urlPath: INFERENCE_PAGES.featureSettings.urlPath,
        classicBreadcrumbs: [...BREADCRUMBS.serverless.search, 'Feature Settings'],
        isNextChrome: await pageObjects.chrome.isNextChrome(),
        isServerless: true,
      });
    }
  );
});
