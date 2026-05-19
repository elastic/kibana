import type { Accessors } from '@kbn/expression-gauge-plugin/common';
import type { CustomPaletteParams, PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import type { GaugeVisualizationState } from './constants';
export declare const getAccessorsFromState: (state?: GaugeVisualizationState) => Accessors | undefined;
export declare const getDefaultPalette: (paletteService: PaletteRegistry) => PaletteOutput<CustomPaletteParams>;
