import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { TimeRange } from '@kbn/es-query';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
/** Namespace for episodes list state inside the `_a` app-state blob */
export declare const EPISODES_LIST_APP_STATE_KEY: "episodesList";
/** Serialized in `_a` so “all statuses” survives reload (distinct from default Active) */
export declare const EPISODES_LIST_STATUS_URL_ALL: "all";
/** Default list filters (Active episodes, no rule/tags/search/assignee). */
export declare const DEFAULT_EPISODES_LIST_FILTER: EpisodesFilterState;
/** Matches {@link useEpisodesTimeRange} fallback when timefilter has no prior state */
export declare const DEFAULT_EPISODES_LIST_TIME_RANGE: TimeRange;
export declare function readEpisodesListAppStateFromUrlStorage(storage: IKbnUrlStateStorage): {
    filterState: EpisodesFilterState;
    timeRange?: TimeRange;
};
export declare function writeEpisodesListAppStateToUrlStorage(storage: IKbnUrlStateStorage, filter: EpisodesFilterState, timeRange: TimeRange): Promise<void>;
