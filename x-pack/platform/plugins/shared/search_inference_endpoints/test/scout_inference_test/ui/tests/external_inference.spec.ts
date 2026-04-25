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
  'External Inference',
  { tag: ['@local-stateful-classic', '@local-stateful-search', '@local-serverless-search'] },
  () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      await mockInferenceEndpoints(page, externalInferenceEndpointsMockData);
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterEach(async ({ page }) => {
      await unmockInferenceEndpoints(page);
    });

    test('renders the External Inference page header', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await externalInference.goto();

      await expect(externalInference.pageHeader).toBeVisible();
    });

    test('empty state renders prompt, add button, and documentation link', async ({
      page,
      pageObjects,
    }) => {
      const { externalInference } = pageObjects;

      await unmockInferenceEndpoints(page);
      await mockInferenceEndpoints(page, []);
      await externalInference.gotoEmptyState();

      await expect(externalInference.emptyPrompt).toBeVisible();
      await expect(externalInference.emptyPromptAddButton).toBeVisible();
      await expect(externalInference.emptyPromptDocumentationLink).toBeVisible();
    });

    test('empty state opens and closes the add inference flyout from the empty prompt', async ({
      page,
      pageObjects,
    }) => {
      const { externalInference } = pageObjects;

      await unmockInferenceEndpoints(page);
      await mockInferenceEndpoints(page, []);
      await externalInference.gotoEmptyState();

      await test.step('clicking add endpoint opens the flyout', async () => {
        await externalInference.emptyPromptAddButton.click();
        await expect(externalInference.inferenceFlyout).toBeVisible();
      });

      await test.step('clicking close hides the flyout', async () => {
        await externalInference.inferenceFlyoutCloseButton.click();
        await expect(externalInference.inferenceFlyout).toBeHidden();
      });
    });

    test('renders the header with api documentation and add endpoint button', async ({
      pageObjects,
    }) => {
      const { externalInference } = pageObjects;

      await externalInference.goto();

      await expect(externalInference.pageHeader).toBeVisible();
      await expect(externalInference.apiDocumentationLink).toBeVisible();
      await expect(externalInference.addEndpointHeaderButton).toBeVisible();
    });

    test('opens and closes the add inference flyout from the header', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await externalInference.goto();

      await test.step('clicking add endpoint opens the flyout', async () => {
        await externalInference.addEndpointHeaderButton.click();
        await expect(externalInference.inferenceFlyout).toBeVisible();
      });

      await test.step('clicking close hides the flyout', async () => {
        await externalInference.inferenceFlyoutCloseButton.click();
        await expect(externalInference.inferenceFlyout).toBeHidden();
      });
    });

    test('renders the tabular view with every external endpoint', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await externalInference.goto();
      await externalInference.selectGroupBy('none');

      await test.step('filter controls are visible', async () => {
        await expect(externalInference.endpointsTable).toBeVisible();
        await expect(externalInference.searchField).toBeVisible();
        await expect(externalInference.serviceFilter).toBeVisible();
        await expect(externalInference.taskTypeFilter).toBeVisible();
      });

      await test.step('each mock endpoint has a row', async () => {
        await expect(externalInference.allEndpointCells).toHaveCount(
          externalInferenceEndpointsMockData.length
        );
        for (const endpoint of externalInferenceEndpointsMockData) {
          await expect(externalInference.endpointCell(endpoint.inference_id)).toBeVisible();
        }
      });

      await test.step('model column is displayed for each row', async () => {
        await expect(externalInference.allModelCells).toHaveCount(
          externalInferenceEndpointsMockData.length
        );
      });
    });

    test('filters the table when typing in the search field', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await externalInference.goto();
      await externalInference.selectGroupBy('none');
      await expect(externalInference.endpointsTable).toBeVisible();

      await test.step('typing a unique substring narrows the list', async () => {
        await externalInference.searchField.fill('cohere');
        await expect(externalInference.allEndpointCells).toHaveCount(1);
        await expect(externalInference.endpointCell('cohere-rerank-03')).toBeVisible();
      });

      await test.step('clearing the search restores all rows', async () => {
        await externalInference.searchField.fill('');
        await expect(externalInference.allEndpointCells).toHaveCount(
          externalInferenceEndpointsMockData.length
        );
      });
    });

    test('endpoint stats update when the table is filtered', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await externalInference.goto();
      await externalInference.selectGroupBy('none');
      await expect(externalInference.endpointStats).toBeVisible();
      await expect(externalInference.endpointStatsEndpointsCount).toHaveText(
        String(externalInferenceEndpointsMockData.length)
      );

      await externalInference.searchField.fill('openai');
      await expect(externalInference.endpointStatsEndpointsCount).toHaveText('2');
    });

    test('supports switching group-by between Service and None', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await externalInference.goto();

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

    test('opens the edit inference flyout from the view endpoint row action', async ({
      pageObjects,
    }) => {
      const { externalInference } = pageObjects;

      await externalInference.goto();
      await externalInference.selectGroupBy('none');
      await expect(externalInference.endpointsTable).toBeVisible();

      await externalInference.openRowActionsFor('openai-chat-completion-01');
      await externalInference.viewEndpointAction.click();
      await expect(externalInference.inferenceFlyout).toBeVisible();
    });

    test('opens and cancels the delete confirm modal for a user-defined endpoint', async ({
      pageObjects,
    }) => {
      const { externalInference } = pageObjects;

      await externalInference.goto();
      await externalInference.selectGroupBy('none');
      await expect(externalInference.endpointsTable).toBeVisible();

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

      await externalInference.goto();
      await externalInference.selectGroupBy('none');
      await expect(externalInference.endpointsTable).toBeVisible();

      await externalInference.openRowActionsFor('openai-chat-completion-01');
      await externalInference.copyEndpointIdAction.click();

      await expect(externalInference.toastList).toContainText('openai-chat-completion-01');
    });
  }
);
