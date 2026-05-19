import type { SuggestionRequest, VisualizationSuggestion } from '@kbn/lens-common';
import type { XYVisualizationState } from './types';
/**
 * Generate suggestions for the xy chart.
 *
 * @param opts
 */
export declare function getSuggestions({ table, state, keptLayerIds, subVisualizationId, mainPalette, isFromContext, allowMixed, datasourceId, query, }: SuggestionRequest<XYVisualizationState>): Array<VisualizationSuggestion<XYVisualizationState>>;
