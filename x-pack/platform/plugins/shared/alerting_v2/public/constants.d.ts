import { ALERTING_V2_SECTION_ID, ALERTING_V2_RULES_APP_ID, ALERTING_V2_ACTION_POLICIES_APP_ID, ALERTING_V2_EPISODES_APP_ID, ALERTING_V2_EXECUTION_HISTORY_APP_ID } from '../common/management_apps';
export { ALERTING_V2_SECTION_ID, ALERTING_V2_RULES_APP_ID, ALERTING_V2_ACTION_POLICIES_APP_ID, ALERTING_V2_EPISODES_APP_ID, ALERTING_V2_EXECUTION_HISTORY_APP_ID, };
export declare const ALERTING_V2_RULES_BASE_PATH = "/app/management/alertingV2/rules";
export declare const ALERTING_V2_ACTION_POLICIES_BASE_PATH = "/app/management/alertingV2/action_policies";
export declare const ALERTING_V2_EPISODES_BASE_PATH = "/app/management/alertingV2/episodes";
export declare const ALERTING_V2_EXECUTION_HISTORY_BASE_PATH = "/app/management/alertingV2/execution_history";
export declare const ALERTING_V2_RULES_MANAGEMENT_PATH = "alertingV2/rules";
export declare const ALERTING_V2_ACTION_POLICIES_MANAGEMENT_PATH = "alertingV2/action_policies";
export declare const ALERTING_V2_EPISODES_MANAGEMENT_PATH = "alertingV2/episodes";
export declare const ALERTING_V2_EXECUTION_HISTORY_MANAGEMENT_PATH = "alertingV2/execution_history";
export declare const MANAGEMENT_APP_ID = "management";
export { ALERTING_V2_RULE_API_PATH, ALERTING_V2_ACTION_POLICY_API_PATH, ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH, ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH, CREATE_WITH_AGENT_INITIAL_PROMPT, } from '@kbn/alerting-v2-constants';
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
    /** Time range embedded in `_a.episodesList.{timeFrom,timeTo}`. */
    timeRange?: {
        from: string;
        to: string;
    };
}
export declare const AGENT_BUILDER_NEW_CONVERSATION_PATH = "/agents/elastic-ai-agent/conversations/new";
export declare const paths: {
    ruleDetails: (id: string) => string;
    ruleList: string;
    actionPolicyCreate: string;
    actionPolicyEdit: (id: string) => string;
    actionPolicyList: string;
    /** Plain base path — safe for `<Route path={...}>` definitions. */
    alertEpisodesList: string;
    /**
     * Builds a deep-link URL to the episodes list, optionally pre-seeding
     * filters and time range via `_a.episodesList.*`.
     *
     * Shape MUST match what `readEpisodesListAppStateFromUrlStorage` reads:
     * flat fields inside `_a.episodesList` (`ruleId`, `groupHash`,
     * `groupingValues`, `timeFrom`, `timeTo`). Time is NOT put in `_g` —
     * the episodes list reads time from `_a.episodesList.{timeFrom,timeTo}`
     * so that no Kibana global-time sync fires on mount and pushes a spurious
     * history entry.
     */
    alertEpisodesListHref: (opts?: AlertEpisodesListLinkOptions) => string;
    alertEpisodeDetails: (episodeId: string) => string;
    executionHistoryList: string;
};
