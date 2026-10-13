/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SOURCE_INDEX = 'test-discover-create-rule';
const RULE_NAME = 'scout-discover-create';

test.describe(
  'Create rule from Discover',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const createdRuleIds: string[] = [];

    test.beforeAll(async ({ esClient, apiServices }) => {
      await apiServices.alertingV2.ebt.optIn();
      await esClient.indices.create(
        {
          index: SOURCE_INDEX,
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              message: { type: 'text' },
            },
          },
        },
        { ignore: [400] }
      );
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAlertingV2Editor();
      await pageObjects.ruleForm.gotoDiscover();
      await pageObjects.ruleForm.switchToEsqlMode();
      await pageObjects.discover.writeAndSubmitEsqlQuery(
        `FROM ${SOURCE_INDEX} | WHERE message != "" | LIMIT 10`
      );
      await pageObjects.discover.waitUntilSearchingHasFinished();
    });

    test.afterAll(async ({ esClient, apiServices }) => {
      for (const id of createdRuleIds) {
        await apiServices.alertingV2.rules.delete(id);
      }
      await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
    });

    test('create flow: submitting the flyout reports the creation as telemetry from Discover', async ({
      pageObjects,
      apiServices,
    }) => {
      await test.step('open the Create ES|QL rule flyout and name the rule', async () => {
        await pageObjects.ruleForm.openRulesFlyoutFromDiscover();
        await pageObjects.ruleForm.navigateToDetailsStep();
        await pageObjects.ruleForm.setRuleName(RULE_NAME);
      });

      await test.step('advance to the Actions step and submit', async () => {
        await pageObjects.ruleForm.clickFlyoutSave(); // Details -> Actions
        await expect(pageObjects.ruleForm.flyoutSubmitButton).toBeVisible();
        await pageObjects.ruleForm.clickFlyoutSave(); // Submit
        await pageObjects.toasts.waitForToastWithText(`Rule "${RULE_NAME}" created successfully`);
        await expect(pageObjects.ruleForm.flyout).toBeHidden({ timeout: 30_000 });
      });

      let ruleId = '';

      await test.step('capture created rule for teardown', async () => {
        await expect
          .poll(
            async () => {
              const { items } = await apiServices.alertingV2.rules.find({ search: RULE_NAME });
              ruleId = items[0]?.id ?? '';
              return ruleId;
            },
            { timeout: 30_000 }
          )
          .not.toBe('');
        createdRuleIds.push(ruleId);
      });

      await test.step('the rule persisted through the API matches the Discover query and flyout input', async () => {
        const rule = await apiServices.alertingV2.rules.get(ruleId);
        expect(rule).toMatchObject({
          id: ruleId,
          kind: 'alert',
          enabled: true,
          metadata: { name: RULE_NAME },
          time_field: '@timestamp',
          schedule: { every: expect.any(String), lookback: expect.any(String) },
        });
        // The flyout splits the Discover query into the base query and the breach condition.
        expect(rule.query).toMatchObject({
          base: `FROM ${SOURCE_INDEX}`,
          breach: { segment: expect.stringContaining('message != ""') },
        });
      });

      await test.step('the creation is reported as telemetry from the Discover app', async () => {
        const [event] = await apiServices.alertingV2.ebt.waitForRuleChangedEvents({
          ruleId,
          operation: 'rule.created',
        });
        expect(event.properties).toMatchObject({
          rule_id: ruleId,
          operation: 'rule.created',
          origin: { actor: 'user', channel: 'ui', app: 'discover' },
        });
      });
    });
  }
);
