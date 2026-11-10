/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { RulesApiService } from '../../../common/services/rules_api_service';
import { buildCreateRuleData, test, testData } from '../fixtures';

const SOURCE_INDEX = 'test-alerting-v2-alerts-privileges-source';
const SOURCE_HOST = 'host-alerts-privileges';
const RULE_NAME = 'scout-alerts-privileges-rule';

/*
 * Covers the UI capability gating on the Alerts (episodes) page (PR #277710).
 * Episode row actions are rendered as UnifiedDataTable leading controls:
 * read-only users only get the read-safe "Open in Discover" action, while
 * editors get the mutating actions (resolve, ack, snooze, tag, assign, ...)
 * which collapse into the overflow actions menu.
 *
 * The suite creates a rule against source data and waits for it to fire an
 * active episode, so the row and the rule are both real.
 */

test.describe('Alerts page - read/write privileges', { tag: testData.UI_TAG }, () => {
  let ruleId: string | undefined;

  const deletePrivilegesRule = async (rules: RulesApiService): Promise<void> => {
    await rules.deleteByQuery({
      filter: `metadata.name: "${RULE_NAME}"`,
      force: true,
    });
  };

  test.beforeAll(async ({ apiServices }) => {
    test.setTimeout(testData.MULTI_ROLE_TEST_TIMEOUT_MS);
    await deletePrivilegesRule(apiServices.alertingV2.rules);
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
        await deletePrivilegesRule(apiServices.alertingV2.rules);
      } finally {
        await apiServices.alertingV2.sourceIndex.delete({ index: SOURCE_INDEX });
      }
    }
  });

  test('editor sees the mutating episode actions menu', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAlertEditor();
    const { alertEpisodesList } = pageObjects;
    await alertEpisodesList.goto();
    await expect(alertEpisodesList.pageContainer).toBeVisible();

    await expect(alertEpisodesList.rowActionsMenuButton).toBeVisible();
  });

  test('read-only user only sees the read-safe open-in-discover action', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginAsAlertAndRuleViewer();
    const { alertEpisodesList } = pageObjects;
    await alertEpisodesList.goto();
    await expect(alertEpisodesList.pageContainer).toBeVisible();

    await test.step('the read-safe open-in-discover control is available', async () => {
      await expect(alertEpisodesList.openInDiscoverRowControl).toBeVisible();
    });

    await test.step('the mutating actions menu is not rendered', async () => {
      await expect(alertEpisodesList.rowActionsMenuButton).toHaveCount(0);
    });
  });
});
