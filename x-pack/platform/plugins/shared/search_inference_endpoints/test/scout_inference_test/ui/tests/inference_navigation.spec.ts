/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { BREADCRUMBS } from '../fixtures/constants';
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

      await expect(pageObjects.navigation.breadcrumbsContainer).toBeVisible();
      await pageObjects.navigation.expectBreadcrumbTexts([
        ...BREADCRUMBS.stateful.classic,
        'Elastic Inference',
      ]);
    }
  );

  test(
    'EIS Models Page: displays correct breadcrumbs in serverless search navigation',
    { tag: [...tags.serverless.search] },
    async ({ page, pageObjects }) => {
      await mockInferenceEndpoints(page, eisEndpointsMockData);
      await pageObjects.eisModels.goto();

      await expect(pageObjects.navigation.breadcrumbsContainer).toBeVisible();
      await pageObjects.navigation.expectBreadcrumbTexts(
        [...BREADCRUMBS.serverless.search, 'Elastic Inference'],
        { isServerless: true }
      );
    }
  );

  test(
    'External Inference Page: displays correct breadcrumbs in classic navigation',
    { tag: [...tags.stateful.classic] },
    async ({ page, pageObjects }) => {
      await mockInferenceEndpoints(page, externalInferenceEndpointsMockData);
      await pageObjects.externalInference.goto();

      await expect(pageObjects.navigation.breadcrumbsContainer).toBeVisible();
      await pageObjects.navigation.expectBreadcrumbTexts([
        ...BREADCRUMBS.stateful.classic,
        'External Inference',
      ]);
    }
  );

  test(
    'External Inference Page: displays correct breadcrumbs in serverless search navigation',
    { tag: [...tags.serverless.search] },
    async ({ page, pageObjects }) => {
      await mockInferenceEndpoints(page, externalInferenceEndpointsMockData);
      await pageObjects.externalInference.goto();

      await expect(pageObjects.navigation.breadcrumbsContainer).toBeVisible();
      await pageObjects.navigation.expectBreadcrumbTexts(
        [...BREADCRUMBS.serverless.search, 'External Inference'],
        { isServerless: true }
      );
    }
  );

  test(
    'Feature Settings Page: displays correct breadcrumbs in classic navigation',
    { tag: [...tags.stateful.classic] },
    async ({ page, pageObjects }) => {
      await mockInferenceEndpoints(page, eisEndpointsMockData);
      await pageObjects.featureSettings.goto();

      await expect(pageObjects.navigation.breadcrumbsContainer).toBeVisible();
      await pageObjects.navigation.expectBreadcrumbTexts([
        ...BREADCRUMBS.stateful.classic,
        'Feature Settings',
      ]);
    }
  );

  test(
    'Feature Settings Page: displays correct breadcrumbs in serverless search navigation',
    { tag: [...tags.serverless.search] },
    async ({ page, pageObjects }) => {
      await mockInferenceEndpoints(page, eisEndpointsMockData);
      await pageObjects.featureSettings.goto();

      await expect(pageObjects.navigation.breadcrumbsContainer).toBeVisible();
      await pageObjects.navigation.expectBreadcrumbTexts(
        [...BREADCRUMBS.serverless.search, 'Feature Settings'],
        { isServerless: true }
      );
    }
  );
});
