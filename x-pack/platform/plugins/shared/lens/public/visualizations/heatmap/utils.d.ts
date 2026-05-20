import { type PaletteRegistry } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { HeatmapVisualizationState, Palette } from './types';
export declare function getSafePaletteParams(paletteService: PaletteRegistry, currentData: Datatable | undefined, accessor: string | undefined, activePalette?: HeatmapVisualizationState['palette']): {
    displayStops: never[];
    activePalette: Palette | undefined;
    currentMinMax?: undefined;
} | {
    displayStops: {
        stop: number;
        color: string;
    }[];
    currentMinMax: import("@kbn/coloring").DataBounds;
    activePalette: Palette;
};
