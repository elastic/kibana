/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { buildAlertEvent, test } from '../fixtures';
import { mockEpisodeActionPolicyHistory } from '../fixtures/mocks';

const ACTION_POLICY_ID = 'episode-policy-history-policy';
const ACTION_POLICY_NAME = 'Episode policy history policy';
const RULE_ID = 'episode-policy-history-rule';
const RULE_NAME = 'Episode policy history rule';
const GROUP_HASH = 'episode-policy-history-series-1';
const EPISODE_ID = 'episode-policy-history-ep-1';

/*
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe(
  'Episode details — action policy history tab',
  { tag: '@local-stateful-classic' },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();

      await apiServices.alertingV2.ruleEvents.seed([
        buildAlertEvent({
          rule: { id: RULE_ID, version: 1 },
          group_hash: GROUP_HASH,
          episode: { id: EPISODE_ID, status: 'active' },
          status: 'breached',
          '@timestamp': new Date().toISOString(),
        }),
      ]);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAlertingV2Viewer();
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.alertActionsEvents.cleanUp();
      await apiServices.alertingV2.ruleEvents.cleanUp();
    });

    test('shows the episode policy execution history and filters it by outcome', async ({
      page,
      pageObjects,
    }) => {
      await mockEpisodeActionPolicyHistory(page, {
        policyId: ACTION_POLICY_ID,
        policyName: ACTION_POLICY_NAME,
        ruleId: RULE_ID,
        ruleName: RULE_NAME,
      });

      await test.step('open the policy history tab and see the dispatched row', async () => {
        await pageObjects.episodeDetails.goto(EPISODE_ID);
        await pageObjects.episodeDetails.openActionPolicyHistoryTab();

        await expect(pageObjects.episodeDetails.policyCell(ACTION_POLICY_NAME)).toBeVisible();
      });

      await test.step('the search bar and outcome filter are shown, but not the rule filter', async () => {
        await expect(pageObjects.episodeDetails.searchBar).toBeVisible();
        await expect(pageObjects.episodeDetails.outcomeFilter).toBeVisible();
        await expect(pageObjects.episodeDetails.ruleFilter).toHaveCount(0);
      });

      await test.step('filtering to Throttled hides the dispatched row', async () => {
        await pageObjects.episodeDetails.selectOutcome('throttled');

        await expect(pageObjects.episodeDetails.filteredEmptyPrompt).toBeVisible();
        await expect(pageObjects.episodeDetails.policyCell(ACTION_POLICY_NAME)).toHaveCount(0);
      });
    });
  }
);
