import type { PaletteRegistry } from '@kbn/coloring';
import type { ThemeServiceStart } from '@kbn/core/public';
import type { OperationMetadata, Visualization } from '@kbn/lens-common';
import type { HeatmapVisualizationState } from './types';
interface HeatmapVisualizationDeps {
    paletteService: PaletteRegistry;
    theme: ThemeServiceStart;
}
export declare const isBucketed: (op: OperationMetadata) => boolean;
export declare const filterOperationsAxis: (op: OperationMetadata) => boolean;
export declare const isCellValueSupported: (op: OperationMetadata) => boolean;
export declare const getHeatmapVisualization: ({ paletteService, theme, }: HeatmapVisualizationDeps) => Visualization<HeatmapVisualizationState>;
export {};
