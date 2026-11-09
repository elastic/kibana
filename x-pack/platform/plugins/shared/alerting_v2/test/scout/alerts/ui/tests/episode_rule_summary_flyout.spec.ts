/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { RulesApiService } from '../../../common/services/rules_api_service';
import { buildCreateRuleData, test, testData } from '../fixtures';

const SOURCE_INDEX = 'test-alerting-v2-episode-rule-summary-source';
const SOURCE_HOST = 'host-episode-rule-summary';
const RULE_NAME = 'scout-episode-rule-summary-rule';

/*
 * Opens the rule summary flyout from a v2 rule's name in the Alerts (episodes)
 * table. The rule fires against real source data, so the row, the rule fetch
 * and the flyout are all real.
 */

test.describe('Alerts page - rule summary flyout', { tag: testData.UI_TAG }, () => {
  let ruleId: string | undefined;

  const deleteSummaryRule = async (rules: RulesApiService): Promise<void> => {
    await rules.deleteByQuery({
      filter: `metadata.name: "${RULE_NAME}"`,
      force: true,
    });
  };

  test.beforeAll(async ({ apiServices }) => {
    await deleteSummaryRule(apiServices.alertingV2.rules);
    await apiServices.alertingV2.sourceIndex.create({
      index: SOURCE_INDEX,
      mappings: {
        'host.name': { type: 'keyword' },
      },
    });
    await apiServices.alertingV2.sourceIndex.indexDocs({
      index: SOURCE_INDEX,
      docs: [{ '@timestamp': new Date().toISOString(), 'host.name': SOURCE_HOST }],
    });

    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({
        metadata: { name: RULE_NAME },
        query: {
          base: `FROM ${SOURCE_INDEX} | WHERE host.name == "${SOURCE_HOST}" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
        },
      })
    );
    ruleId = rule.id;
    await apiServices.alertingV2.ruleRunner.waitForEvents(rule.id, 1, {
      episodeStatus: 'active',
    });
  });

  test.afterAll(async ({ apiServices }) => {
    try {
      if (ruleId) {
        await apiServices.alertingV2.ruleEvents.cleanUp({ ruleId });
      }
    } finally {
      try {
        await deleteSummaryRule(apiServices.alertingV2.rules);
      } finally {
        await apiServices.alertingV2.sourceIndex.delete({ index: SOURCE_INDEX });
      }
    }
  });

  test('opens and closes the rule summary flyout from a v2 rule row', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginAsAlertAndRuleViewer();
    const { alertEpisodesList } = pageObjects;
    await alertEpisodesList.goto();
    await expect(alertEpisodesList.pageContainer).toBeVisible();

    await test.step('clicking the rule name opens the rule summary flyout', async () => {
      await alertEpisodesList.ruleNameLink(RULE_NAME).click();
      await expect(alertEpisodesList.ruleSummaryFlyout).toBeVisible();
      await expect(alertEpisodesList.ruleSummaryFlyout).toContainText(RULE_NAME);
    });

    await test.step('the close button closes the flyout', async () => {
      await alertEpisodesList.ruleSummaryFlyoutCloseButton.click();
      await expect(alertEpisodesList.ruleSummaryFlyout).toBeHidden();
    });
  });
});
