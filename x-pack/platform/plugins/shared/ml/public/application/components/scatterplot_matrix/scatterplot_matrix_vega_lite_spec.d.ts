import type { TopLevelSpec } from 'vega-lite/build/vega-lite';
import { type EuiThemeComputed } from '@elastic/eui';
import type { LegendType } from '../vega_chart/common';
export declare const OUTLIER_SCORE_FIELD = "outlier_score";
export declare const USER_SELECTION = "user_selection";
export declare const SINGLE_POINT_CLICK = "single_point_click";
export declare const COLOR_BLUR = "#bbb";
export declare const COLOR_OUTLIER: string;
export declare const COLOR_SELECTION: string;
export declare const COLOR_RANGE_OUTLIER: string[];
export declare const COLOR_RANGE_NOMINAL: import("@elastic/eui/src/services/color/eui_palettes").EuiPalette;
export declare const COLOR_RANGE_QUANTITATIVE: import("@elastic/eui/src/services/color/eui_palettes").EuiPalette;
export declare const getColorSpec: (forCustomVisLink: boolean, escapedOutlierScoreField?: string, color?: string, legendType?: LegendType) => {
    condition: {
        selection: string;
        field: string;
        type: LegendType;
        scale: {
            range: import("@elastic/eui/src/services/color/eui_palettes").EuiPalette;
        };
    };
    value: string;
} | {
    condition: {
        selection: string;
    }[];
    value: string;
};
export declare function getEscapedVegaFieldName(fieldName: string, prependString?: string): string;
type VegaValue = Record<string, string | number>;
export declare const getScatterplotMatrixVegaLiteSpec: (forCustomVisLink: boolean, values: VegaValue[], backgroundValues: VegaValue[], columns: string[], euiTheme: EuiThemeComputed, resultsField?: string, color?: string, legendType?: LegendType, dynamicSize?: boolean) => TopLevelSpec;
export {};
