/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { OSQUERY_API_HEADERS } from '../../common/constants';
import { uniqueId } from '../../common/helpers';

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
        headers: OSQUERY_API_HEADERS,
      });
      expect(ruleResponse.data).toBeDefined();
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
          headers: OSQUERY_API_HEADERS,
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

      await test.step('check accessibility of response actions form', async () => {
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="response-actions-form"]'],
        });
        expect(violations).toHaveLength(0);
      });
    });
  }
);
