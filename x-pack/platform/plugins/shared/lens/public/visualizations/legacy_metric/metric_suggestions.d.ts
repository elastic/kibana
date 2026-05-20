import type { SuggestionRequest, VisualizationSuggestion, LegacyMetricState } from '@kbn/lens-common';
/**
 * Generate suggestions for the metric chart.
 *
 * @param opts
 */
export declare function getSuggestions({ table, state, keptLayerIds, datasourceId, }: SuggestionRequest<LegacyMetricState>): Array<VisualizationSuggestion<LegacyMetricState>>;
