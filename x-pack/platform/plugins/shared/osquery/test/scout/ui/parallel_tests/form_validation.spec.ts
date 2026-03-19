/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const API_HEADERS = {
  'kbn-xsrf': 'true',
  'elastic-api-version': testData.OSQUERY_API_VERSION,
};

const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe(
  'Osquery response actions form validation',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleId: string;

    test.beforeAll(async ({ kbnClient }) => {
      const ruleResponse = await kbnClient.request({
        method: 'POST',
        path: '/api/detection_engine/rules',
        body: {
          type: 'query',
          index: ['auditbeat-*'],
          language: 'kuery',
          query: '_id:*',
          name: `Validation test rule ${uniqueId()}`,
          description: 'Rule for form validation tests',
          risk_score: 21,
          severity: 'low',
          interval: '5m',
          from: 'now-360s',
          to: 'now',
          enabled: false,
        },
        headers: API_HEADERS,
      });
      ruleId = (ruleResponse.data as Record<string, string>).id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ kbnClient }) => {
      if (ruleId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/detection_engine/rules?id=${ruleId}`,
          headers: API_HEADERS,
          ignoreErrors: [404],
        });
      }
    });

    test('validates required field errors and error independence', async ({
      pageObjects,
      page,
    }) => {
      const { responseActionsForm } = pageObjects;

      await test.step('navigate to response actions form', async () => {
        await responseActionsForm.gotoRuleEdit(ruleId);
        await responseActionsForm.clickActionsTab();
        await expect(
          page.getByText('Response actions are run on each rule execution.')
        ).toBeVisible();
      });

      await test.step('add query action and validate required field error', async () => {
        await responseActionsForm.addOsqueryAction(0);
        await responseActionsForm.triggerQueryValidation(0);
        await expect(responseActionsForm.errorsContainer).toContainText(
          'Query is a required field'
        );
      });

      await test.step('verify timeout error appears alongside query error (error independence)', async () => {
        await responseActionsForm.expandAdvanced(0);
        await responseActionsForm.clearTimeout(0);
        await expect(
          responseActionsForm
            .getResponseActionItem(0)
            .getByText('The timeout value must be 60 seconds or higher.')
        ).toBeVisible();
        await expect(responseActionsForm.errorsContainer).toContainText(
          'Query is a required field'
        );
      });

      await test.step('fix timeout, verify query error persists', async () => {
        await responseActionsForm.fillTimeout('666', 0);
        await expect(
          responseActionsForm
            .getResponseActionItem(0)
            .getByText('The timeout value must be 60 seconds or higher.')
        ).toBeHidden();
        await expect(responseActionsForm.errorsContainer).toContainText(
          'Query is a required field'
        );
      });

      await test.step('fill query, verify all errors gone', async () => {
        await responseActionsForm.fillQuery('select * from uptime', 0);
        await expect(responseActionsForm.errorsContainer).toBeHidden();
      });

      await test.step('add pack-based action and validate required field', async () => {
        await responseActionsForm.addOsqueryAction(1);
        await responseActionsForm.switchToPackMode(1);
        await expect(responseActionsForm.errorsContainer).toContainText('Pack is a required field');
      });
    });
  }
);
