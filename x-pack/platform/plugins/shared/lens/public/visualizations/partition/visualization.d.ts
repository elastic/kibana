import type { PaletteRegistry } from '@kbn/coloring';
import type { ThemeServiceStart } from '@kbn/core/public';
import type { FormatFactory } from '@kbn/visualization-ui-components';
import type { Visualization, LensPartitionLayerState, LensPartitionVisualizationState } from '@kbn/lens-common';
import type { DatasourcePublicAPI } from '../..';
export declare const isCollapsed: (columnId: string, layer: LensPartitionLayerState) => boolean;
export declare const hasNonCollapsedSliceBy: (l: LensPartitionLayerState) => boolean;
export declare const getDefaultColorForMultiMetricDimension: ({ layer, columnId, paletteService, datasource, palette, }: {
    layer: LensPartitionLayerState;
    columnId: string;
    paletteService: PaletteRegistry;
    datasource: DatasourcePublicAPI | undefined;
    palette?: LensPartitionVisualizationState["palette"];
}) => string;
export declare const getPieVisualization: ({ paletteService, kibanaTheme, formatFactory, }: {
    paletteService: PaletteRegistry;
    kibanaTheme: ThemeServiceStart;
    formatFactory: FormatFactory;
}) => Visualization<LensPartitionVisualizationState>;
