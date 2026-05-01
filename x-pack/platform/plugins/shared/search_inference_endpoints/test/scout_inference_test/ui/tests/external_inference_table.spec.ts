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
  'External Inference - table',
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

    test('renders the tabular view with every external endpoint', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await test.step('filter controls are visible', async () => {
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

    test('filters the table by service', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await test.step('opening the service filter and selecting OpenAI narrows the rows', async () => {
        await externalInference.openServiceFilter();
        await externalInference.filterOption('OpenAI').click();
        await expect(externalInference.allEndpointCells).toHaveCount(2);
        await expect(externalInference.endpointCell('openai-chat-completion-01')).toBeVisible();
        await expect(externalInference.endpointCell('openai-text-embedding-02')).toBeVisible();
      });

      await test.step('clearing the service filter restores all rows', async () => {
        await externalInference.filterOption('OpenAI').click();
        await expect(externalInference.allEndpointCells).toHaveCount(
          externalInferenceEndpointsMockData.length
        );
      });
    });

    test('filters the table by task type', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await test.step('opening the type filter and selecting text_embedding narrows the rows', async () => {
        await externalInference.openTaskTypeFilter();
        await externalInference.filterOption('text_embedding').click();
        await expect(externalInference.allEndpointCells).toHaveCount(2);
        await expect(externalInference.endpointCell('openai-text-embedding-02')).toBeVisible();
        await expect(
          externalInference.endpointCell('hugging-face-text-embedding-04')
        ).toBeVisible();
      });

      await test.step('clearing the task type filter restores all rows', async () => {
        await externalInference.filterOption('text_embedding').click();
        await expect(externalInference.allEndpointCells).toHaveCount(
          externalInferenceEndpointsMockData.length
        );
      });
    });

    test('endpoint stats update when the table is filtered', async ({ pageObjects }) => {
      const { externalInference } = pageObjects;

      await expect(externalInference.endpointStats).toBeVisible();
      await expect(externalInference.endpointStatsEndpointsCount).toHaveText(
        String(externalInferenceEndpointsMockData.length)
      );

      await externalInference.searchField.fill('openai');
      await expect(externalInference.endpointStatsEndpointsCount).toHaveText('2');
    });
  }
);
