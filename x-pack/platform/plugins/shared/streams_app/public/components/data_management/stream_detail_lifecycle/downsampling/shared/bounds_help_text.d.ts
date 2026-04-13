import type { PreservedTimeUnit } from './time_unit_types';
export declare const getBoundsHelpTextValues: ({ lowerBoundMs, upperBoundMs, unit, }: {
    lowerBoundMs: number;
    upperBoundMs: number | undefined;
    unit: PreservedTimeUnit;
}) => {
    min: string;
    max: string | undefined;
};
