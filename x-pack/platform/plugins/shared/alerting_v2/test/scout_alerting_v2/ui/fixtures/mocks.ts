/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH } from '@kbn/alerting-v2-constants';
import type {
  ListPolicyExecutionHistoryResponse,
  PolicyExecutionHistoryItem,
} from '@kbn/alerting-v2-schemas';

interface MockEpisodeActionPolicyHistoryOptions {
  policyId: string;
  policyName: string;
  ruleId: string;
  ruleName: string;
}

/**
 * Stubs the action-policy execution-history list endpoint for the episode tab.
 *
 * The dispatcher → event-log pipeline that populates this endpoint is covered
 * by the API integration and Jest suites; mocking here keeps the UI test
 * deterministic (no dispatcher timing) while still exercising the real tab,
 * table, and outcome-filter wiring. The response varies by the `outcome` query
 * param so the test can assert the filter narrows the table:
 *  - `throttled` → no rows (the seeded episode only has a `dispatched` outcome)
 *  - anything else (`all` / `dispatched`) → a single `dispatched` row
 */
export const mockEpisodeActionPolicyHistory = async (
  page: ScoutPage,
  { policyId, policyName, ruleId, ruleName }: MockEpisodeActionPolicyHistoryOptions
) => {
  const dispatchedItem: PolicyExecutionHistoryItem = {
    '@timestamp': new Date().toISOString(),
    policy: { id: policyId, name: policyName },
    outcome: 'dispatched',
    episode_count: 1,
    action_group_count: 1,
    rules: [{ id: ruleId, name: ruleName }],
    totalRuleCount: 1,
    workflows: [],
  };

  await page.route(
    (url) => url.pathname.endsWith(ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH),
    async (route) => {
      const requestUrl = new URL(route.request().url());
      const outcome = requestUrl.searchParams.get('outcome');
      const perPage = Number(requestUrl.searchParams.get('perPage') ?? 10);
      const items = outcome === 'throttled' ? [] : [dispatchedItem];

      const body: ListPolicyExecutionHistoryResponse = {
        items,
        page: 1,
        perPage,
        totalEvents: items.length,
        searchMatches: null,
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    }
  );
};
