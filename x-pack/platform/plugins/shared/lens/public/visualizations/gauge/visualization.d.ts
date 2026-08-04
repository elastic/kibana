import type { PaletteRegistry } from '@kbn/coloring';
import type { OperationMetadata, Visualization } from '@kbn/lens-common';
import type { GaugeVisualizationState } from './constants';
interface GaugeVisualizationDeps {
    paletteService: PaletteRegistry;
}
export declare const isNumericMetric: (op: OperationMetadata) => boolean;
export declare const isNumericDynamicMetric: (op: OperationMetadata) => boolean;
export declare const getGaugeVisualization: ({ paletteService, }: GaugeVisualizationDeps) => Visualization<GaugeVisualizationState>;
export {};
