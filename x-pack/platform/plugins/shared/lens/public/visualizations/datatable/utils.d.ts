import type { ColorMapping, ColorStop, CustomPaletteParams, DataBounds, PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin/common';
export declare function getColumnAlignment<C extends {
    alignment?: 'left' | 'right' | 'center';
}>({ alignment }: C, isNumeric?: boolean): 'left' | 'right' | 'center';
export declare function hasIncompatibleColorConfig({ colorByTerms, palette, colorMapping, }: {
    colorByTerms: boolean;
    palette?: PaletteOutput<{
        stops?: ColorStop[] | number[];
    }>;
    colorMapping?: ColorMapping.Config | string;
}): boolean;
/**
 * Gets data bounds for an accessor
 */
export declare function getDataBoundsForAccessor(accessor: string, currentData?: Datatable, stateColumns?: Array<{
    isTransposed?: boolean;
}>): DataBounds | undefined;
export declare function getColorByValuePalette(paletteService: PaletteRegistry, dataBounds: DataBounds, existingPalette?: PaletteOutput<CustomPaletteParams>): PaletteOutput<CustomPaletteParams>;
/**
 * Applies correct default color configuration
 */
export declare function getColorDefaults({ colorByTerms, paletteService, dataBounds, }: {
    colorByTerms: boolean;
    paletteService: PaletteRegistry;
    dataBounds: DataBounds;
}): {
    palette: PaletteOutput<CustomPaletteParams> | undefined;
    colorMapping: ColorMapping.Config | undefined;
};
