declare const timeUnitsLabels: {
    d: {
        plural: string;
        singular: string;
    };
    h: {
        plural: string;
        singular: string;
    };
    m: {
        plural: string;
        singular: string;
    };
    s: {
        plural: string;
        singular: string;
    };
    ms: {
        plural: string;
        singular: string;
    };
    micros: {
        plural: string;
        singular: string;
    };
    nanos: {
        plural: string;
        singular: string;
    };
};
export type StreamsTimeUnit = keyof typeof timeUnitsLabels;
export declare const getTimeUnitLabel: (unit: StreamsTimeUnit, { plural }?: {
    plural?: boolean;
}) => string;
export declare const splitSizeAndUnits: (field: string) => {
    size: string;
    unit: string;
};
export declare const getTimeSizeAndUnitLabel: (value: string | undefined) => string | undefined;
/**
 * Converts a time value to milliseconds
 */
export declare const toMillis: (value?: string) => number | undefined;
export declare const isZeroAge: (value?: string) => boolean;
export {};
