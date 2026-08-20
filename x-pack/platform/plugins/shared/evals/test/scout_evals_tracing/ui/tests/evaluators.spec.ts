/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { mockEvaluatorApis } from '../fixtures/mocks';

test.describe('Evaluator management', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsPrivilegedUser();
    await mockEvaluatorApis(page);
  });

  test('filters the catalog and keeps built-ins read-only', async ({ pageObjects }) => {
    await pageObjects.evaluators.goto();

    await expect(pageObjects.evaluators.row('correctness')).toBeVisible();
    await expect(pageObjects.evaluators.row('latency')).toBeVisible();
    await expect(pageObjects.evaluators.row('correctness').getByRole('button')).toHaveCount(0);

    await pageObjects.evaluators.search.fill('latency');
    await expect(pageObjects.evaluators.row('latency')).toBeVisible();
    await expect(pageObjects.evaluators.row('correctness')).toHaveCount(0);

    await pageObjects.evaluators.search.clear();
    await pageObjects.evaluators.kindFilter.selectOption('code');
    await expect(pageObjects.evaluators.row('latency')).toBeVisible();
    await expect(pageObjects.evaluators.row('quality')).toHaveCount(0);

    await pageObjects.evaluators.kindFilter.selectOption('all');
    await pageObjects.evaluators.originFilter.selectOption('user_defined');
    await expect(pageObjects.evaluators.row('quality')).toBeVisible();
    await expect(pageObjects.evaluators.row('correctness')).toHaveCount(0);
  });

  test('creates, edits, and deletes a user-defined evaluator', async ({ pageObjects }) => {
    await pageObjects.evaluators.goto();
    await pageObjects.evaluators.openCreate();
    await pageObjects.evaluators.fillRequiredFields('new-quality', 'Initial description');
    await pageObjects.evaluators.saveButton.click();
    await expect(pageObjects.evaluators.row('new-quality')).toBeVisible();

    await pageObjects.evaluators.search.fill('new-quality');
    await pageObjects.evaluators.editUserDefinedEvaluator('Updated description');
    await expect(pageObjects.evaluators.row('new-quality')).toContainText('Updated description');

    await pageObjects.evaluators.deleteUserDefinedEvaluator();
    await expect(pageObjects.evaluators.row('new-quality')).toHaveCount(0);
  });

  test('runs an optional evaluator test without requiring a save', async ({
    page,
    pageObjects,
  }) => {
    await page.route('**/internal/evals/evaluators/_test*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            status: 'ok',
            evaluator: { name: 'quality', kind: 'llm' },
            scores: [{ name: 'quality', score: 0.8, explanation: 'The response is clear.' }],
          },
        }),
      });
    });
    await pageObjects.evaluators.goto();
    await pageObjects.evaluators.search.fill('quality');
    await pageObjects.evaluators.row('quality').getByTestId('evalsEvaluatorEdit').click();
    await pageObjects.evaluators.runTest();

    await expect(pageObjects.evaluators.testResult).toContainText('quality: 0.8');
    await expect(pageObjects.evaluators.testResult).toContainText('The response is clear.');
  });

  test('shows evaluator test failures without requiring a save', async ({ pageObjects }) => {
    await pageObjects.evaluators.goto();
    await pageObjects.evaluators.search.fill('quality');
    await pageObjects.evaluators.row('quality').getByTestId('evalsEvaluatorEdit').click();
    await pageObjects.evaluators.runTest();

    await expect(pageObjects.evaluators.testResult).toContainText(
      'The trace does not contain the required response.'
    );
  });

  test('keeps user-defined evaluators isolated by space', async ({ apiServices, pageObjects }) => {
    const suffix = Date.now().toString(36);
    const firstSpace = `evals-a-${suffix}`;
    const secondSpace = `evals-b-${suffix}`;
    let firstSpaceCreated = false;
    let secondSpaceCreated = false;

    try {
      await apiServices.spaces.create({ id: firstSpace, name: 'Evals A', disabledFeatures: [] });
      firstSpaceCreated = true;
      await apiServices.spaces.create({ id: secondSpace, name: 'Evals B', disabledFeatures: [] });
      secondSpaceCreated = true;

      await pageObjects.evaluators.goto(firstSpace);
      await pageObjects.evaluators.openCreate();
      await pageObjects.evaluators.fillRequiredFields('space-quality', 'Only in the first space');
      await pageObjects.evaluators.saveButton.click();
      await expect(pageObjects.evaluators.row('space-quality')).toBeVisible();

      await pageObjects.evaluators.goto(secondSpace);
      await expect(pageObjects.evaluators.row('space-quality')).toHaveCount(0);
    } finally {
      await Promise.all([
        ...(firstSpaceCreated ? [apiServices.spaces.delete(firstSpace)] : []),
        ...(secondSpaceCreated ? [apiServices.spaces.delete(secondSpace)] : []),
      ]);
    }
  });
});
