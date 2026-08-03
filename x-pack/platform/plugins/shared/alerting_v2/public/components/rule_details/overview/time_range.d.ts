/** Default activity window shared by the alert and signal rule overviews. */
export declare const DEFAULT_ACTIVITY_TIME_RANGE: {
    from: string;
    to: string;
};
/**
 * Resolves a datemath time range to absolute epoch-ms bounds, falling back to a
 * 7-day window when either bound cannot be parsed.
 */
export declare const resolveGteLte: (from: string, to: string) => {
    windowStartMs: number;
    windowEndMs: number;
};
