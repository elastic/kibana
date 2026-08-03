import type { LensPartitionVisualizationState, SuggestionRequest, VisualizationSuggestion } from '@kbn/lens-common';
export declare function suggestions({ table, state, keptLayerIds, mainPalette, subVisualizationId, }: SuggestionRequest<LensPartitionVisualizationState>): Array<VisualizationSuggestion<LensPartitionVisualizationState>>;
