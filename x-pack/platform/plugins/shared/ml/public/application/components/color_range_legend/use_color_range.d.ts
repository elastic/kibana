/**
 * Custom color scale factory that takes the amount of feature influencers
 * into account to adjust the contrast of the color range. This is used for
 * color coding for outlier detection where the amount of feature influencers
 * affects the threshold from which the influencers value can actually be
 * considered influential.
 *
 * @param n number of influencers
 * @returns a function suitable as a preprocessor for scaleLinear()
 */
export declare const influencerColorScaleFactory: (n: number) => (t: number) => number;
export declare enum COLOR_RANGE_SCALE {
    LINEAR = "linear",
    INFLUENCER = "influencer",
    SQRT = "sqrt"
}
/**
 * Color range scale options in the format for EuiSelect's options prop.
 */
export declare const colorRangeScaleOptions: {
    value: COLOR_RANGE_SCALE;
    text: string;
}[];
export declare enum COLOR_RANGE {
    BLUE = "blue",
    RED = "red",
    RED_GREEN = "red-green",
    GREEN_RED = "green-red",
    YELLOW_GREEN_BLUE = "yellow-green-blue"
}
/**
 * Color range options in the format for EuiSelect's options prop.
 */
export declare const colorRangeOptions: {
    value: COLOR_RANGE;
    text: string;
}[];
/**
 * Custom hook to get a d3 based color range to be used for color coding in table cells.
 *
 * @param colorRange COLOR_RANGE enum.
 * @param colorRangeScale COLOR_RANGE_SCALE enum.
 * @param featureCount
 */
export declare const useColorRange: (colorRange?: COLOR_RANGE, colorRangeScale?: COLOR_RANGE_SCALE, featureCount?: number) => import("d3-scale").ScaleLinear<string, string, never> | ((n: number) => string) | import("d3-scale").ScalePower<string, string, never>;
