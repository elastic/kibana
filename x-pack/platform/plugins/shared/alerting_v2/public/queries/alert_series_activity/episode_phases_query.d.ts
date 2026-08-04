export interface BuildEpisodePhasesQueryOptions {
    ruleId: string;
    /** Display window lower bound (epoch ms) — segments are drawn within this window. */
    windowStartMs: number;
    windowEndMs: number;
    /** The exact episodes being drawn (from {@link buildEpisodeSelectionQuery}). */
    episodeIds: string[];
}
export declare const buildEpisodePhasesQuery: ({ ruleId, windowStartMs, windowEndMs, episodeIds, }: BuildEpisodePhasesQueryOptions) => import("@elastic/esql").ComposerQuery;
