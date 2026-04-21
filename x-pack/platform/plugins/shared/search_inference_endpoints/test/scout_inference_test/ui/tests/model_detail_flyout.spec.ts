/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { eisEndpointsMockData } from '../fixtures/mock_data/eis_endpoints';
import { mockInferenceEndpoints, unmockInferenceEndpoints } from '../fixtures/mocks';

test.describe(
  'Model Detail Flyout',
  { tag: ['@local-stateful-classic', '@local-stateful-search', '@local-serverless-search'] },
  () => {
    test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
      await mockInferenceEndpoints(page, eisEndpointsMockData);
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.eisModels.goto();
    });

    test.afterEach(async ({ page }) => {
      await unmockInferenceEndpoints(page);
    });

    test('opens flyout with model details, task badges, and author', async ({ pageObjects }) => {
      const { eisModels } = pageObjects;

      await test.step('click a model card to open the flyout', async () => {
        await eisModels.modelCard('Anthropic Claude Sonnet 3.7').click();
      });

      await test.step('flyout is visible with model name', async () => {
        await expect(eisModels.flyout).toBeVisible();
        await expect(eisModels.flyout).toContainText('Anthropic Claude Sonnet 3.7');
      });

      await test.step('flyout header shows task type badges', async () => {
        await expect(eisModels.flyoutTaskBadges).toContainText('chat_completion');
        await expect(eisModels.flyoutTaskBadges).toContainText('completion');
      });

      await test.step('flyout body shows model author', async () => {
        await expect(eisModels.flyoutModelDetails).toContainText('Model author');
        await expect(eisModels.flyoutModelDetails).toContainText('Anthropic');
      });
    });

    test('flyout shows correct endpoint count and closes via button', async ({ pageObjects }) => {
      const { eisModels } = pageObjects;

      await test.step('open flyout for Anthropic model', async () => {
        await eisModels.modelCard('Anthropic Claude Sonnet 3.7').click();
        await expect(eisModels.flyout).toBeVisible();
      });

      await test.step('Anthropic model has exactly 2 endpoint rows', async () => {
        await expect(eisModels.allEndpointRows).toHaveCount(2);
        await expect(
          eisModels.endpointRow('.mock-anthropic-claude-3.7-sonnet-chat_completion')
        ).toBeVisible();
        await expect(
          eisModels.endpointRow('.mock-anthropic-claude-3.7-sonnet-completion')
        ).toBeVisible();
      });

      await test.step('close flyout via close button', async () => {
        await eisModels.flyoutCloseButton.click();
        await expect(eisModels.flyout).toBeHidden();
      });
    });

    test('non-preconfigured endpoint shows delete button', async ({ pageObjects }) => {
      const { eisModels } = pageObjects;

      await test.step('open flyout for OpenAI model (has a non-preconfigured endpoint)', async () => {
        await eisModels.modelCard('OpenAI GPT-4.1').click();
        await expect(eisModels.flyout).toBeVisible();
      });

      await test.step('OpenAI model has 3 endpoint rows', async () => {
        await expect(eisModels.allEndpointRows).toHaveCount(3);
      });

      await test.step('non-preconfigured endpoint has delete button', async () => {
        await expect(
          eisModels.deleteEndpointButton('my-custom-openai-gpt-4.1-chat_completion')
        ).toBeVisible();
      });

      await test.step('preconfigured endpoint does not have delete button', async () => {
        await expect(
          eisModels.deleteEndpointButton('.mock-openai-gpt-4.1-chat_completion')
        ).toBeHidden();
      });
    });

    test('opens add endpoint modal from flyout and cancels', async ({ pageObjects }) => {
      const { eisModels } = pageObjects;

      await test.step('open flyout', async () => {
        await eisModels.modelCard('OpenAI GPT-4.1').click();
        await expect(eisModels.flyout).toBeVisible();
      });

      await test.step('click add endpoint button', async () => {
        await eisModels.flyoutAddEndpointButton.click();
      });

      await test.step('add endpoint modal is visible with expected fields', async () => {
        await expect(eisModels.addEndpointModal).toBeVisible();
        await expect(eisModels.addEndpointIdField).toBeVisible();
        await expect(eisModels.addEndpointSaveButton).toBeVisible();
        await expect(eisModels.addEndpointCancelButton).toBeVisible();
      });

      await test.step('cancel closes the modal', async () => {
        await eisModels.addEndpointCancelButton.click();
        await expect(eisModels.addEndpointModal).toBeHidden();
        await expect(eisModels.flyout).toBeVisible();
      });
    });

    test('opens view endpoint modal from flyout', async ({ pageObjects }) => {
      const { eisModels } = pageObjects;

      await test.step('open flyout', async () => {
        await eisModels.modelCard('Anthropic Claude Sonnet 3.7').click();
        await expect(eisModels.flyout).toBeVisible();
      });

      await test.step('click the view button on an endpoint row', async () => {
        const endpointRow = eisModels.endpointRow(
          '.mock-anthropic-claude-3.7-sonnet-chat_completion'
        );
        await endpointRow.getByRole('button', { name: 'View endpoint' }).click();
      });

      await test.step('view modal is visible with close button and no save button', async () => {
        await expect(eisModels.addEndpointModal).toBeVisible();
        await expect(eisModels.addEndpointModal).toContainText('View endpoint');
        await expect(eisModels.addEndpointCloseButton).toBeVisible();
        await expect(eisModels.addEndpointSaveButton).toBeHidden();
      });

      await test.step('close the view modal', async () => {
        await eisModels.addEndpointCloseButton.click();
        await expect(eisModels.addEndpointModal).toBeHidden();
      });
    });
  }
);
