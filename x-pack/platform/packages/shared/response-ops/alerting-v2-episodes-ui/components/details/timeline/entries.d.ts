import type { IconType } from '@elastic/eui';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { type EpisodeSeverity } from '../../severity/severity_utils';
import type { EpisodeActionHistoryEntry } from '../../../queries/episode_actions_history_query';
export interface StateChangeSourceRow {
    '@timestamp': string;
    'episode.status': AlertEpisodeStatus;
    event_count?: number;
}
export interface StateChangeEntry {
    kind: 'state_change';
    timestamp: string;
    newStatus: AlertEpisodeStatus;
    /** undefined when this is the episode's initial status */
    prevStatus: AlertEpisodeStatus | undefined;
    prevEventCount: number;
}
export interface SeverityChangeSourceRow {
    '@timestamp': string;
    severity?: string | null;
    event_count?: number;
}
export interface SeverityChangeEntry {
    kind: 'severity_change';
    timestamp: string;
    newSeverity: EpisodeSeverity;
    /** undefined when this is the episode's initial supported severity */
    prevSeverity: EpisodeSeverity | undefined;
    prevEventCount: number;
}
export interface ActionEntry {
    kind: 'action';
    entry: EpisodeActionHistoryEntry;
}
export type TimelineEntry = StateChangeEntry | SeverityChangeEntry | ActionEntry;
/** Icon shown on the avatar for each action type (no system actor profile). */
export declare const ACTION_ICON: Record<string, IconType>;
/**
 * Collapses a chronological run of episode event rows into the status
 * transitions between them, tracking how many events preceded each change.
 */
export declare const deriveStateChangeEntries: (eventRows: StateChangeSourceRow[]) => StateChangeEntry[];
/**
 * Collapses a chronological run of episode severity rows into the supported
 * severity transitions between them, tracking how many events preceded each change.
 */
export declare const deriveSeverityChangeEntries: (eventRows: SeverityChangeSourceRow[]) => SeverityChangeEntry[];
/** Merges state changes, severity changes, and action history into a single newest-first list. */
export declare const mergeTimelineEntries: (stateChangeEntries: StateChangeEntry[], severityChangeEntries: SeverityChangeEntry[], actionEntries: EpisodeActionHistoryEntry[]) => TimelineEntry[];
export declare const formatTimestamp: (iso: string) => string;
