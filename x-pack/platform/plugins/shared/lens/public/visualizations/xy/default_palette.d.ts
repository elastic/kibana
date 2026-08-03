import type { KbnPaletteId } from '@kbn/palettes';
import type { SeriesType as LensSeriesType } from './types';
/**
 * Returns the default palette id for a given series type.
 */
export declare const getDefaultPalette: (seriesType: LensSeriesType) => KbnPaletteId;
