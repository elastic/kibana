import type { ComposerQuery } from '@elastic/esql';
import { type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
export interface AlertEpisode {
    '@timestamp': string;
    'episode.id': string;
    'episode.status': AlertEpisodeStatus;
    'rule.id': string;
    group_hash: string;
    first_timestamp: string;
    last_timestamp: string;
    duration: number;
    /** ISO timestamp of the first event where episode.status === 'active'. */
    triggered_at?: string;
    last_ack_action?: 'ack' | 'unack';
    last_assignee_uid?: string | null;
    last_snooze_action?: 'snooze' | 'unsnooze';
    snooze_expiry?: string;
    last_tags?: string[];
    /** JSON string from the latest **non-empty** alert `data` (see `addEpisodeAggregation`) */
    episode_data?: string | null;
    /** Latest top-level `severity` from a breached rule event, when present. */
    severity?: string | null;
}
/**
 * Raw ES|QL response shape before client-side normalization.
 */
export interface AlertEpisodeEsqlRow extends Omit<AlertEpisode, 'last_tags'> {
    last_tags?: string | string[] | null;
}
export declare const ALERT_EPISODE_FIELDS: readonly ["@timestamp", "episode.id", "episode.status", "rule.id", "group_hash", "first_timestamp", "last_timestamp", "duration", "triggered_at", "last_ack_action", "last_assignee_uid", "last_snooze_action", "snooze_expiry", "last_tags", "episode_data", "severity"];
export interface EpisodesFilterState {
    /** Status values (OR). Empty/undefined shows all statuses. */
    status?: string[] | null;
    /** Rule ID or null */
    ruleId?: string | null;
    /** Group hash — narrows to a single per-rule series (used for deep-links from rule details). */
    groupHash?: string | null;
    /**
     * Display-only companion to `groupHash`. When a deep-link carries the
     * resolved grouping field values (e.g. `{ "host.name": "web-01" }`), the
     * destination chip can render `host=web-01` without re-running the DSL
     * lookup. Does NOT affect the query — `buildEpisodesQuery` ignores it.
     */
    groupingValues?: Record<string, string | null> | null;
    /** Query string for full-text search */
    queryString?: string | null;
    /** Tag values — episodes matching any selected tag (OR) */
    tags?: string[] | null;
    /** Severity values (OR). Includes EPISODE_SEVERITY_FILTER_NONE for episodes without severity. */
    severity?: string[] | null;
    /** Assignee UID — episodes whose last assignee matches this user profile UID */
    assigneeUid?: string;
}
export interface EpisodesSortState {
    sortField: string;
    sortDirection: 'asc' | 'desc';
}
export declare const addEpisodeAggregation: (query: ComposerQuery) => void;
/**
 * Builds an ES|QL query that aggregates episode data from `.rule-events` and
 * `.alert-actions` (last tags per group_hash, last ack / assignee per
 * episode) and narrows to alert episode rows.
 *
 * `episode.status` comes straight from `.rule-events`. User-initiated
 * `deactivate` / `activate` actions also write a synthetic `.rule-events`
 * doc, so the column is always current — the UI does **not** derive an
 * `effective_status` by joining `.alert-actions` audit rows back in.
 */
export declare const buildEpisodesBaseQuery: (spaceId: string, search?: string) => ComposerQuery;
/**
 * Builds an ES|QL query for episodes request with sorting and filtering.
 *
 * Joins `.rule-events` and `.alert-actions` so that per-group action state
 * (snooze, tags) and per-episode action state (ack, assignee) are available
 * for filtering. `episode.status` is read directly from `.rule-events`.
 */
export declare const buildEpisodesQuery: (spaceId: string, sortState?: EpisodesSortState, filterState?: EpisodesFilterState) => ComposerQuery;
/**
 * Builds an ES|QL query that computes six KPI counts in a single STATS pass.
 * Uses indicator EVALs (CASE-based 0/1 columns) so all aggregations can share
 * one STATS command without sub-queries.
 *
 * Counts: active_alerts, firing_rules, assigned_to_me, unassigned, acknowledged, snoozed.
 */
export declare const buildEpisodesKpisQuery: (spaceId: string, currentUserUid?: string, filterState?: EpisodesFilterState) => string;
/**
 * Builds a lightweight ESQL query for histogram data.
 * Returns only the fields needed for overlap counting; no SORT.
 * Time range is applied by the caller via executeEsqlQuery's input.timeRange.
 */
export declare const buildEpisodesHistogramQuery: (spaceId: string, filterState?: EpisodesFilterState, breakdownField?: string) => ComposerQuery;
