import type { PaletteRegistry } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { AccessorConfig } from '@kbn/visualization-ui-components';
import type { FramePublicAPI } from '@kbn/lens-common';
import type { FormatFactory } from '../../../common/types';
import type { XYDataLayerConfig, XYLayerConfig } from './types';
export declare const defaultReferenceLineColor: string;
export declare const getLayerPaletteName: (layer: XYDataLayerConfig) => string;
export type ColorAssignments = Record<string, {
    totalSeriesCount: number;
    getRank(sortedLayer: XYDataLayerConfig, seriesKey: string, yAccessor: string): number;
}>;
export declare function getColorAssignments(layers: XYLayerConfig[], data: {
    tables: Record<string, Datatable>;
}, formatFactory: FormatFactory): ColorAssignments;
export declare function getAssignedColorConfig(layer: XYLayerConfig, accessor: string, colorAssignments: ColorAssignments, frame: Pick<FramePublicAPI, 'datasourceLayers'>, paletteService: PaletteRegistry, isDarkMode?: boolean): AccessorConfig;
export declare function getAccessorColorConfigs(colorAssignments: ColorAssignments, frame: Pick<FramePublicAPI, 'datasourceLayers'>, layer: XYLayerConfig, paletteService: PaletteRegistry, isDarkMode?: boolean): AccessorConfig[];
