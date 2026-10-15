/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { RULE_CREATED_EBT_EVENT_TYPE } from '../../../../../server/lib/telemetry/rule_changed_event';
import type { RulesApiService } from '../../../common/services';
import { test } from '../fixtures';

const SOURCE_INDEX = 'test-ebt-telemetry';
const DISCOVER_RULE_NAME = 'scout-ebt-discover-create';
const COMPOSE_RULE_NAME = 'scout-ebt-compose-create';

test.describe(
  'Rule changed EBT telemetry',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const createdRuleIds: string[] = [];

    const findRuleIdByName = async (rules: RulesApiService, name: string): Promise<string> => {
      let ruleId = '';
      await expect
        .poll(
          async () => {
            const { items } = await rules.find({ search: name });
            ruleId = items[0]?.id ?? '';
            return ruleId;
          },
          { timeout: 30_000 }
        )
        .not.toBe('');
      createdRuleIds.push(ruleId);
      return ruleId;
    };

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
      await esClient.index({
        index: SOURCE_INDEX,
        document: { '@timestamp': new Date().toISOString(), message: 'hello' },
        refresh: 'wait_for',
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAlertingV2Editor();
    });

    test.afterAll(async ({ esClient, apiServices }) => {
      for (const id of createdRuleIds) {
        await apiServices.alertingV2.rules.delete(id);
      }
      await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
    });

    test('reports a rule created from Discover with the discover app', async ({
      pageObjects,
      apiServices,
    }) => {
      await test.step('create a rule from the Discover flyout', async () => {
        await pageObjects.ruleForm.gotoDiscover();
        await pageObjects.ruleForm.switchToEsqlMode();
        await pageObjects.discover.writeAndSubmitEsqlQuery(
          `FROM ${SOURCE_INDEX} | WHERE message != "" | LIMIT 10`
        );
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await pageObjects.ruleForm.openRulesFlyoutFromDiscover();
        await pageObjects.ruleForm.navigateToDetailsStep();
        await pageObjects.ruleForm.setRuleName(DISCOVER_RULE_NAME);
        await pageObjects.ruleForm.clickFlyoutSave(); // Details -> Actions
        await expect(pageObjects.ruleForm.flyoutSubmitButton).toBeVisible();
        await pageObjects.ruleForm.clickFlyoutSave(); // Submit
        await expect(pageObjects.ruleForm.flyout).toBeHidden({ timeout: 30_000 });
      });

      const ruleId = await findRuleIdByName(apiServices.alertingV2.rules, DISCOVER_RULE_NAME);

      const [event] = await apiServices.alertingV2.ebt.waitForRuleChangedEvents({
        ruleId,
        eventType: RULE_CREATED_EBT_EVENT_TYPE,
      });
      expect(event.properties).toMatchObject({
        rule_id: ruleId,
        origin: { actor: 'user', channel: 'ui', app: 'discover' },
      });
    });

    test('reports a rule created from the rules list with the observabilityAlerting app', async ({
      page,
      pageObjects,
      apiServices,
    }) => {
      await test.step('create a rule from the compose flyout', async () => {
        await pageObjects.rulesList.goto();
        await expect(page.testSubj.locator('rulesListLoading')).toBeHidden({ timeout: 60_000 });
        await pageObjects.composeDiscover.openCreateFlyout();
        await pageObjects.composeDiscover.openSandbox();
        await pageObjects.composeDiscover.setSandboxQuery(
          `FROM ${SOURCE_INDEX} | STATS count = COUNT(*) | WHERE count > 0`
        );
        await pageObjects.composeDiscover.clickApply();
        await expect(pageObjects.composeDiscover.nextButton).toBeEnabled();
        await pageObjects.composeDiscover.clickNext(); // Outcome
        await pageObjects.composeDiscover.clickNext(); // Details
        await pageObjects.composeDiscover.setRuleName(COMPOSE_RULE_NAME);
        await pageObjects.composeDiscover.clickNext(); // Actions
        await pageObjects.composeDiscover.clickSubmit();
        await expect(pageObjects.composeDiscover.flyout).toBeHidden({ timeout: 30_000 });
      });

      const ruleId = await findRuleIdByName(apiServices.alertingV2.rules, COMPOSE_RULE_NAME);

      const [event] = await apiServices.alertingV2.ebt.waitForRuleChangedEvents({
        ruleId,
        eventType: RULE_CREATED_EBT_EVENT_TYPE,
      });
      expect(event.properties).toMatchObject({
        rule_id: ruleId,
        origin: { actor: 'user', channel: 'ui', app: 'observabilityAlerting' },
      });
    });
  }
);
