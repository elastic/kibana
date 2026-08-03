import { type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
export interface FlappingSettings {
    lookBackWindow: number;
    statusChangeThreshold: number;
}
export declare const DEFAULT_EPISODE_FLAPPING_SETTINGS: FlappingSettings;
/**
 * Counts active <-> recovering transitions in the last `lookBackWindow` statuses.
 * Transitions involving pending/inactive do not count.
 */
export declare const countEpisodeStateChanges: (statuses: AlertEpisodeStatus[], settings?: FlappingSettings) => number;
/**
 * Returns true when the episode has a full look-back window of events and the
 * number of active <-> recovering transitions in that window meets the threshold.
 */
export declare const isEpisodeFlapping: (statuses: AlertEpisodeStatus[], settings?: FlappingSettings) => boolean;
