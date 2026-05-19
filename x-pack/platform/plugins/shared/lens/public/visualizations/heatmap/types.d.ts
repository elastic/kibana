import type { PaletteOutput, CustomPaletteParams } from '@kbn/coloring';
import type { HeatmapArguments } from '@kbn/expression-heatmap-plugin/common';
import type { LensLayerType as LayerType } from '@kbn/lens-common';
export type ChartShapes = 'heatmap';
export type HeatmapLayerState = Omit<HeatmapArguments, 'palette'> & {
    layerId: string;
    layerType: LayerType;
    valueAccessor?: string;
    xAccessor?: string;
    yAccessor?: string;
    shape: ChartShapes;
};
export type Palette = PaletteOutput<CustomPaletteParams> & {
    accessor: string;
};
export type HeatmapVisualizationState = HeatmapLayerState & {
    palette?: Palette;
};
