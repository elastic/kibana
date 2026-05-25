/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';
import { BREADCRUMBS } from '../fixtures/constants';
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
      'EIS Models Page: displays correct breadcrumbs in search solution navigation',
      async ({ page, pageObjects }) => {
        await mockInferenceEndpoints(page, eisEndpointsMockData);
        await pageObjects.eisModels.goto();

        await expect(pageObjects.navigation.breadcrumbsContainer).toBeVisible();
        await pageObjects.navigation.expectBreadcrumbTexts([
          ...BREADCRUMBS.stateful.searchSolution,
          'Elastic Inference',
        ]);
      }
    );

    spaceTest(
      'External Inference Page: displays correct breadcrumbs in search solution navigation',
      async ({ page, pageObjects }) => {
        await mockInferenceEndpoints(page, externalInferenceEndpointsMockData);
        await pageObjects.externalInference.goto();

        await expect(pageObjects.navigation.breadcrumbsContainer).toBeVisible();
        await pageObjects.navigation.expectBreadcrumbTexts([
          ...BREADCRUMBS.stateful.searchSolution,
          'External Inference',
        ]);
      }
    );

    spaceTest(
      'Feature Settings Page: displays correct breadcrumbs in search solution navigation',
      async ({ page, pageObjects }) => {
        await mockInferenceEndpoints(page, eisEndpointsMockData);
        await pageObjects.featureSettings.goto();

        await expect(pageObjects.navigation.breadcrumbsContainer).toBeVisible();
        await pageObjects.navigation.expectBreadcrumbTexts([
          ...BREADCRUMBS.stateful.searchSolution,
          'Feature Settings',
        ]);
      }
    );
  }
);
