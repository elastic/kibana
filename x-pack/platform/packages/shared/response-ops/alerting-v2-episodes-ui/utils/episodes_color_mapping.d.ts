import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { EpisodesFilterState } from '../queries/episodes_query';
export interface EpisodeStatusColors {
    danger: string;
    success: string;
    primary: string;
    warning: string;
}
/** Maps episode status values to their display colors. */
export declare const getStatusColorMap: (colors: EpisodeStatusColors) => Record<string, string>;
/**
 * Patches a Lens `TypedLensByValueInput` attributes object to apply episode-aware
 * color coding and strip axis titles.
 *
 * - When `breakdownField` is `'episode.status'`: applies a categorical color
 *   mapping so each status value gets its own color.
 * - When there is no breakdown: colors the whole series to match the active
 *   status filter, falling back to `danger` (red) when no filter is set.
 * - Otherwise: only strips the axis titles (base visualization adjustment).
 */
export declare const buildModifiedVisAttributes: (attributes: TypedLensByValueInput["attributes"], breakdownField: string | undefined, filterState: EpisodesFilterState, colors: EpisodeStatusColors) => TypedLensByValueInput["attributes"];
