import type { SuggestionRequest, VisualizationSuggestion } from '@kbn/lens-plugin/public';
import type { ChoroplethChartState } from './types';
/**
 * Avoid loading file layers during plugin setup
 * Instead, load file layers when getSuggestions is called
 * Since getSuggestions is sync, the trade off is that
 * getSuggestions will return no suggestions until file layers load
 */
export declare function getSuggestionsLazy(suggestionRequest: SuggestionRequest<ChoroplethChartState>): Array<VisualizationSuggestion<ChoroplethChartState>>;
