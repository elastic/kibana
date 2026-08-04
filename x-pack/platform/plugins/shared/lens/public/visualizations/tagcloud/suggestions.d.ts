import type { SuggestionRequest, VisualizationSuggestion } from '@kbn/lens-common';
import type { TagcloudState } from './types';
export declare function getSuggestions({ table, state, keptLayerIds, mainPalette, subVisualizationId, }: SuggestionRequest<TagcloudState>): Array<VisualizationSuggestion<TagcloudState>>;
