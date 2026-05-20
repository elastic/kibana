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
  'External Inference - row actions',
  { tag: ['@local-stateful-classic', '@local-stateful-search', '@local-serverless-search'] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await mockInferenceEndpoints(page, externalInferenceEndpointsMockData);
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.externalInference.goto();
      await pageObjects.externalInference.selectGroupBy('none');
      await expect(pageObjects.externalInference.endpointsTable).toBeVisible();
    });

    test.afterEach(async ({ page }) => {
      await unmockInferenceEndpoints(page);
    });

    test('opens the edit inference flyout from the view endpoint row action', async ({
      pageObjects,
    }) => {
      const { externalInference } = pageObjects;

      await externalInference.openRowActionsFor('openai-chat-completion-01');
      await externalInference.viewEndpointAction.click();
      await expect(externalInference.inferenceFlyout).toBeVisible();
    });

    test('opens and cancels the delete confirm modal for a user-defined endpoint', async ({
      pageObjects,
    }) => {
      const { externalInference } = pageObjects;

      await test.step('the delete row action is enabled and clickable', async () => {
        await externalInference.openRowActionsFor('openai-chat-completion-01');
        await expect(externalInference.deleteActionUserDefined).toBeEnabled();
        await externalInference.deleteActionUserDefined.click();
      });

      await test.step('the confirm modal shows the right endpoint id', async () => {
        await expect(externalInference.deleteConfirmModal).toBeVisible();
        await expect(externalInference.deleteConfirmModalEndpointName).toContainText(
          'openai-chat-completion-01'
        );
      });

      await test.step('cancel hides the modal and returns to the table', async () => {
        await externalInference.deleteConfirmModalCancelButton.click();
        await expect(externalInference.deleteConfirmModal).toBeHidden();
        await expect(externalInference.endpointsTable).toBeVisible();
      });
    });

    test('copy endpoint id action shows a confirmation toast', async ({ context, pageObjects }) => {
      const { externalInference } = pageObjects;

      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await externalInference.openRowActionsFor('openai-chat-completion-01');
      await externalInference.copyEndpointIdAction.click();

      await expect(externalInference.toastList).toContainText('openai-chat-completion-01');
    });
  }
);
