/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode as encodeRison } from '@kbn/rison';

export const ALERTING_V2_SECTION_ID = 'alertingV2';
export const ALERTING_V2_RULES_APP_ID = 'rules';
export const ALERTING_V2_ACTION_POLICIES_APP_ID = 'action_policies';
export const ALERTING_V2_EPISODES_APP_ID = 'episodes';
export const ALERTING_V2_EXECUTION_HISTORY_APP_ID = 'execution_history';

export const ALERTING_V2_RULES_BASE_PATH = `/app/management/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_RULES_APP_ID}`;
export const ALERTING_V2_ACTION_POLICIES_BASE_PATH = `/app/management/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_ACTION_POLICIES_APP_ID}`;
export const ALERTING_V2_EPISODES_BASE_PATH = `/app/management/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EPISODES_APP_ID}`;
export const ALERTING_V2_EXECUTION_HISTORY_BASE_PATH = `/app/management/${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EXECUTION_HISTORY_APP_ID}`;

export const ALERTING_V2_RULES_MANAGEMENT_PATH = `${ALERTING_V2_SECTION_ID}/${ALERTING_V2_RULES_APP_ID}`;
export const ALERTING_V2_ACTION_POLICIES_MANAGEMENT_PATH = `${ALERTING_V2_SECTION_ID}/${ALERTING_V2_ACTION_POLICIES_APP_ID}`;
export const ALERTING_V2_EPISODES_MANAGEMENT_PATH = `${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EPISODES_APP_ID}`;
export const ALERTING_V2_EXECUTION_HISTORY_MANAGEMENT_PATH = `${ALERTING_V2_SECTION_ID}/${ALERTING_V2_EXECUTION_HISTORY_APP_ID}`;

export const MANAGEMENT_APP_ID = 'management';
export {
  ALERTING_V2_RULE_API_PATH,
  ALERTING_V2_ACTION_POLICY_API_PATH,
  ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH,
  ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_COUNT_API_PATH,
} from '@kbn/alerting-v2-constants';

export interface AlertEpisodesListLinkOptions {
  /** Pre-applied filters carried via the rison-encoded `_a` query param. */
  filters?: {
    ruleId?: string;
    groupHash?: string;
    status?: string;
    /**
     * Display-only companion to `groupHash`. When the source surface (e.g.
     * the rule details heatmap) has already resolved grouping field values,
     * passing them through avoids a second lookup at the destination.
     */
    groupingValues?: Record<string, string | null>;
  };
  /** Time range carried via the rison-encoded `_g` query param (Kibana global state). */
  timeRange?: { from: string; to: string };
}

export const CREATE_WITH_AGENT_INITIAL_PROMPT =
  'Load the rule-management skill and help me create a new alerting v2 rule. Ask me what I want to monitor and guide me through the setup.';

export const AGENT_BUILDER_NEW_CONVERSATION_PATH = '/agents/elastic-ai-agent/conversations/new';

export const paths = {
  ruleDetails: (id: string) => `${ALERTING_V2_RULES_BASE_PATH}/${encodeURIComponent(id)}`,
  ruleList: ALERTING_V2_RULES_BASE_PATH,
  actionPolicyCreate: `${ALERTING_V2_ACTION_POLICIES_BASE_PATH}/create`,
  actionPolicyEdit: (id: string) =>
    `${ALERTING_V2_ACTION_POLICIES_BASE_PATH}/edit/${encodeURIComponent(id)}`,
  actionPolicyList: ALERTING_V2_ACTION_POLICIES_BASE_PATH,
  alertEpisodesList: (opts?: AlertEpisodesListLinkOptions): string => {
    if (!opts) return ALERTING_V2_EPISODES_BASE_PATH;
    const search = new URLSearchParams();
    // Strip empty / nullish values to keep the URL compact. Empty objects
    // (e.g. a rule with no grouping fields) are dropped too — they're noise.
    const filters = opts.filters
      ? Object.fromEntries(
          Object.entries(opts.filters).filter(([, v]) => {
            if (v == null || v === '') return false;
            if (typeof v === 'object' && Object.keys(v).length === 0) return false;
            return true;
          })
        )
      : {};
    // Shape MUST match what `useEpisodesUrlState` reads — `_a` carries
    // `{ filters, sort }` and `_g` carries `{ time }` (Kibana global state).
    if (Object.keys(filters).length > 0) {
      search.set('_a', encodeRison({ filters }));
    }
    if (opts.timeRange) {
      search.set('_g', encodeRison({ time: opts.timeRange }));
    }
    const qs = search.toString();
    return qs ? `${ALERTING_V2_EPISODES_BASE_PATH}?${qs}` : ALERTING_V2_EPISODES_BASE_PATH;
  },
  alertEpisodeDetails: (episodeId: string) =>
    `${ALERTING_V2_EPISODES_BASE_PATH}/${encodeURIComponent(episodeId)}`,
  executionHistoryList: ALERTING_V2_EXECUTION_HISTORY_BASE_PATH,
};
