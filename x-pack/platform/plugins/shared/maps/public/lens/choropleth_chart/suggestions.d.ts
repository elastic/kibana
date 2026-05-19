import type { FileLayer } from '@elastic/ems-client';
import type { SuggestionRequest, VisualizationSuggestion } from '@kbn/lens-plugin/public';
import type { ChoroplethChartState } from './types';
/**
 * Generate choroplath chart suggestions for buckets that match administrative boundaries from the Elastic Maps Service.
 */
export declare function getSuggestions(suggestionRequest: SuggestionRequest<ChoroplethChartState>, emsFileLayers: FileLayer[]): Array<VisualizationSuggestion<ChoroplethChartState>>;
