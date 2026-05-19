import type { PercentilesFieldMeta } from '../../../common/descriptor_types';
export declare const DEFAULT_HEATMAP_COLOR_RAMP_NAME = "theclassic";
export declare const DEFAULT_FILL_COLORS: string[];
export declare const DEFAULT_LINE_COLORS: string[];
export declare const NUMERICAL_COLOR_PALETTES: (import("@elastic/eui/src/components/color_picker/color_palette_picker/color_palette_picker").EuiColorPalettePickerPaletteGradientProps & {
    getPalette: (steps: number) => string[];
})[];
export declare const CATEGORICAL_COLOR_PALETTES: (import("@elastic/eui/src/components/color_picker/color_palette_picker/color_palette_picker").EuiColorPalettePickerPaletteFixedProps & {
    getPalette: (steps: number) => string[];
})[];
export declare function getColorPalette(colorPaletteId: string): string[];
export declare function getColorRampCenterColor(colorPaletteId: string): string | null;
export declare function getOrdinalMbColorRampStops(colorPaletteId: string | null, min: number, max: number, invert: boolean): Array<number | string> | null;
export declare function getPercentilesMbColorRampStops(colorPaletteId: string | null, percentiles: PercentilesFieldMeta, invert: boolean): Array<number | string> | null;
export declare function getLinearGradient(colorStrings: string[]): string;
