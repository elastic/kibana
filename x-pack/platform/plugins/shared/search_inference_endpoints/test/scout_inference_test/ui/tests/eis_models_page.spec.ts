/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { INFERENCE_LOCAL_TAGS } from '../../scout_test_tags';
import { test } from '../fixtures';
import { eisEndpointsMockData } from '../fixtures/mock_data/eis_endpoints';
import { mockInferenceEndpoints, unmockInferenceEndpoints } from '../fixtures/mocks';

test.describe('EIS Models Page', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await mockInferenceEndpoints(page, eisEndpointsMockData);
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.eisModels.goto();
  });

  test.afterEach(async ({ page }) => {
    await unmockInferenceEndpoints(page);
  });

  test('displays page header and documentation link', async ({ pageObjects }) => {
    await expect(pageObjects.eisModels.pageHeader).toBeVisible();
    await expect(pageObjects.eisModels.documentationLink).toBeVisible();
  });

  test('renders model cards from mock data', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await test.step('correct number of model cards are displayed', async () => {
      await expect(eisModels.allModelCards).toHaveCount(4);
    });

    await test.step('each model card is visible with expected name', async () => {
      await expect(eisModels.modelCard('Anthropic Claude Sonnet 3.7')).toBeVisible();
      await expect(eisModels.modelCard('OpenAI GPT-4.1')).toBeVisible();
      await expect(eisModels.modelCard('Google Gemini 2.5 Pro')).toBeVisible();
      await expect(eisModels.modelCard('Elastic ELSER v2')).toBeVisible();
    });
  });

  test('search filters model cards', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await test.step('all model cards are visible before search', async () => {
      await expect(eisModels.allModelCards).toHaveCount(4);
    });

    await test.step('typing a search term reduces the card count', async () => {
      await eisModels.searchBar.fill('Anthropic');
      await expect(eisModels.allModelCards).toHaveCount(1);
      await expect(eisModels.modelCard('Anthropic Claude Sonnet 3.7')).toBeVisible();
    });

    await test.step('clearing search restores all cards', async () => {
      await eisModels.searchBar.clear();
      await expect(eisModels.allModelCards).toHaveCount(4);
    });
  });

  test('task type filter buttons filter model cards', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await test.step('all model cards visible before filtering', async () => {
      await expect(eisModels.allModelCards).toHaveCount(4);
    });

    await test.step('clicking LLM filter excludes embedding-only model', async () => {
      await eisModels.taskTypeFilter('LLM').click();
      await expect(eisModels.allModelCards).toHaveCount(3);
      await expect(eisModels.modelCard('Elastic ELSER v2')).toBeHidden();
    });

    await test.step('clicking LLM filter again deselects and restores all cards', async () => {
      await eisModels.taskTypeFilter('LLM').click();
      await expect(eisModels.allModelCards).toHaveCount(4);
    });
  });

  test('model family filter filters cards by provider', async ({ page, pageObjects }) => {
    const { eisModels } = pageObjects;

    await test.step('open model family filter popover', async () => {
      await eisModels.modelFamilyFilter.getByRole('button').click();
    });

    await test.step('select Anthropic provider and close popover', async () => {
      await page.getByRole('option', { name: 'Anthropic' }).click();
      await eisModels.modelFamilyFilter.getByRole('button').click();
    });

    await test.step('only Anthropic model card is shown', async () => {
      await expect(eisModels.allModelCards).toHaveCount(1);
      await expect(eisModels.modelCard('Anthropic Claude Sonnet 3.7')).toBeVisible();
    });
  });

  test('shows empty state when no models match search', async ({ pageObjects }) => {
    const { eisModels } = pageObjects;

    await test.step('search for non-existent model', async () => {
      await eisModels.searchBar.fill('nonexistent-model-xyz');
    });

    await test.step('no models found prompt is displayed', async () => {
      await expect(eisModels.noModelsFound).toBeVisible();
      await expect(eisModels.allModelCards).toHaveCount(0);
    });
  });
});
