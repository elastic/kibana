import type { ColorMappingInputData, PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { KbnPalettes } from '@kbn/palettes';
import type { RawValue } from '@kbn/data-plugin/common';
export type CellColorFn = (value: RawValue) => string | null;
export declare function getCellColorFn(paletteService: PaletteRegistry, palettes: KbnPalettes, data: ColorMappingInputData, colorByTerms: boolean, isDarkMode: boolean, syncColors: boolean, palette?: PaletteOutput<CustomPaletteState>, colorMapping?: string): CellColorFn;
