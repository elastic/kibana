export interface EpisodeTagOptionRow {
    tags: string;
}
/**
 * Distinct tag values from tag actions in the selected time range (via kibana_context).
 */
export declare const buildEpisodeTagOptionsQuery: () => import("@elastic/esql").ComposerQuery;
