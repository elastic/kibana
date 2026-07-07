/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { externalInferenceEndpointsMockData } from '../fixtures/mock_data/external_inference_endpoints';
import { mockInferenceEndpoints, unmockInferenceEndpoints } from '../fixtures/mocks';

test.describe(
  'External Inference - group by',
  { tag: ['@local-stateful-classic', '@local-stateful-search', '@local-serverless-search'] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await mockInferenceEndpoints(page, externalInferenceEndpointsMockData);
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.externalInference.goto();
    });

    test.afterEach(async ({ page }) => {
      await unmockInferenceEndpoints(page);
    });

    test('supports switching group-by between Service and None', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await test.step('group-by selector is visible', async () => {
        await expect(externalInference.groupBySelect).toBeVisible();
      });

      await test.step('switching to service updates the label', async () => {
        await externalInference.selectGroupBy('service');
        await expect(externalInference.groupByButton).toContainText('Service');
      });

      await test.step('switching to none shows the flat table', async () => {
        await externalInference.selectGroupBy('none');
        await expect(externalInference.groupByButton).toContainText('None');
        await expect(externalInference.endpointsTable).toBeVisible();
      });
    });

    test('expand all and collapse all toggle every group accordion', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await externalInference.selectGroupBy('service');

      await test.step('all group accordions are visible', async () => {
        await expect(externalInference.groupAccordion('openai')).toBeVisible();
        await expect(externalInference.groupAccordion('cohere')).toBeVisible();
        await expect(externalInference.groupAccordion('hugging_face')).toBeVisible();
      });

      await test.step('collapse all sets aria-expanded=false on every accordion', async () => {
        await externalInference.collapseAllGroupsButton.click();
        await expect(externalInference.accordionToggleButton('openai')).toHaveAttribute(
          'aria-expanded',
          'false'
        );
        await expect(externalInference.accordionToggleButton('cohere')).toHaveAttribute(
          'aria-expanded',
          'false'
        );
        await expect(externalInference.accordionToggleButton('hugging_face')).toHaveAttribute(
          'aria-expanded',
          'false'
        );
      });

      await test.step('expand all sets aria-expanded=true on every accordion', async () => {
        await externalInference.expandAllGroupsButton.click();
        await expect(externalInference.accordionToggleButton('openai')).toHaveAttribute(
          'aria-expanded',
          'true'
        );
        await expect(externalInference.accordionToggleButton('cohere')).toHaveAttribute(
          'aria-expanded',
          'true'
        );
        await expect(externalInference.accordionToggleButton('hugging_face')).toHaveAttribute(
          'aria-expanded',
          'true'
        );
      });
    });
  }
);
