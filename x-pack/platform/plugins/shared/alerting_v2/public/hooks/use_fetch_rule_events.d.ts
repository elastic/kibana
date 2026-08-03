import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { type AlertTimelinePhaseRow, type AlertTimelineSummary } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import type { SeriesGroupingValuesByHash } from '../queries/alert_series_activity/series_grouping_values_query';
export interface UseFetchRuleEventsOptions {
    ruleId: string | undefined;
    windowStartMs: number;
    windowEndMs: number;
    groupingFields?: readonly string[];
    /** Max episodes drawn per series (lane). Defaults to {@link MAX_EPISODES_PER_LANE}. */
    perLaneLimit?: number;
    data: DataPublicPluginStart;
}
export declare const useFetchRuleEvents: ({ ruleId, windowStartMs, windowEndMs, groupingFields, perLaneLimit, data, }: UseFetchRuleEventsOptions) => {
    phases: AlertTimelinePhaseRow[];
    groupingValuesByHash: SeriesGroupingValuesByHash;
    summary: AlertTimelineSummary;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
};
