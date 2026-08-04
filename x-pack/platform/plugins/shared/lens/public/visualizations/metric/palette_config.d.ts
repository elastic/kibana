import type { RequiredPaletteParamTypes } from '@kbn/coloring';
import type { SecondaryTrend, SecondaryTrendType } from '@kbn/lens-common';
export declare const RANGE_MIN = 0;
export declare const defaultPercentagePaletteParams: RequiredPaletteParamTypes;
export declare const defaultNumberPaletteParams: RequiredPaletteParamTypes;
export declare const DEFAULT_PALETTE_ID: "compare_to";
export declare function getDefaultConfigForMode(mode: SecondaryTrendType): SecondaryTrend;
