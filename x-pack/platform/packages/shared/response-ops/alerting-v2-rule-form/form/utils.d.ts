import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
type TimeUnit = 's' | 'm' | 'h' | 'd';
export declare const POSITIVE_INTEGER_REGEX: RegExp;
export declare const INVALID_NUMBER_KEYS: string[];
export declare const getTimeOptions: (val?: number) => {
    value: TimeUnit;
    text: string;
}[];
export declare const getDurationUnitValue: (duration: string) => TimeUnit;
export declare const getDurationNumberInItsUnit: (duration: string) => number;
export declare const getTimeFieldOptions: (fields: DataViewFieldMap) => Array<{
    text: string;
    value: string;
}>;
export declare const firstFieldOption: {
    text: string;
    value: string;
};
export declare const parseDuration: (duration: string) => number;
export declare const formatDuration: (duration: number, short?: boolean) => string;
export {};
