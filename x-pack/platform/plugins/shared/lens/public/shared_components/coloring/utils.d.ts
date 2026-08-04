import type { DataBounds, PaletteRegistry, PaletteOutput, CustomPaletteParams, ColorMapping } from '@kbn/coloring';
import type { Datatable, DatatableColumnType } from '@kbn/expressions-plugin/common';
import type { KbnPalettes } from '@kbn/palettes';
import type { DataType, DatasourcePublicAPI, OperationDescriptor } from '@kbn/lens-common';
/**
 * Determines if a data type is numeric.
 */
export declare const isDataTypeNumeric: (dataType?: string) => boolean;
/**
 * Returns array of colors for provided palette or colorMapping
 */
export declare function getPaletteDisplayColors(paletteService: PaletteRegistry, palettes: KbnPalettes, isDarkMode: boolean, palette?: PaletteOutput<CustomPaletteParams>, colorMapping?: ColorMapping.Config): string[];
export declare function getAccessorTypeFromOperation(operation: Pick<OperationDescriptor, 'isBucketed' | 'dataType' | 'hasArraySupport'> | null, dataTypeFallback?: DataType | DatatableColumnType, isTextBased?: boolean): {
    isNumeric: boolean;
    isCategory: boolean;
};
/**
 * Analyze the column from the datasource prospective (formal check)
 * to know whether it's a numeric type or not.
 * Optionally accepts a dataTypeFallback from activeData to override schema type
 * when there's a mismatch.
 * Note: to be used for Lens UI only
 */
export declare function getAccessorType(datasource: Pick<DatasourcePublicAPI, 'getOperationForColumnId' | 'isTextBasedLanguage'> | undefined, accessor: string | undefined, dataTypeFallback?: DataType | DatatableColumnType): {
    isNumeric: boolean;
    isCategory: boolean;
};
/**
 * Bucketed numerical columns should be treated as categorical
 * Note: to be used within expression renderer scope only
 */
export declare function shouldColorByTerms(dataType?: DataType | DatatableColumnType, isBucketed?: boolean): boolean;
export declare function getContrastColor(color: string, isDarkTheme: boolean, darkTextProp?: 'euiColorTextInk' | 'euiTextColor', lightTextProp?: 'euiColorTextGhost' | 'euiTextColor'): string;
export declare function getNumericValue(rowValue?: unknown): number | undefined;
export declare function applyPaletteParams<T extends PaletteOutput<CustomPaletteParams>>(palettes: PaletteRegistry, activePalette: T, dataBounds: DataBounds): {
    stop: number;
    color: string;
}[];
export declare const findMinMaxByColumnId: (columnIds: string[], table: Datatable | undefined) => Map<string, DataBounds>;
