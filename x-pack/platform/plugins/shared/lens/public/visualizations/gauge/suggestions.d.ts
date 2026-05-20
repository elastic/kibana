import type { Visualization } from '@kbn/lens-common';
import type { PaletteRegistry } from '@kbn/coloring';
import type { GaugeVisualizationState } from './constants';
type GaugeSuggestionInput = Parameters<Visualization<GaugeVisualizationState>['getSuggestions']>[0] & {
    paletteService: PaletteRegistry;
};
type GaugeSuggestionReturn = ReturnType<Visualization<GaugeVisualizationState>['getSuggestions']>;
export declare const getSuggestions: ({ table, state, keptLayerIds, paletteService, }: GaugeSuggestionInput) => GaugeSuggestionReturn;
export {};
