import type { ColorMappingInputCategoricalData } from '@kbn/coloring';
import type { KbnPalettes } from '@kbn/palettes';
import type { CellColorFn } from './get_cell_color_fn';
/**
 * Return a color accessor function for XY charts depending on the split accessors received.
 */
export declare function getColorAccessorFn(palettes: KbnPalettes, colorMapping: string, data: ColorMappingInputCategoricalData, isDarkMode: boolean): CellColorFn;
