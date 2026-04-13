import type { PreservedTimeUnit, TimeUnit } from './time_unit_types';
export interface TimeUnitSelectOption {
    value: PreservedTimeUnit;
    text: string;
}
export declare const isPreservedNonDefaultUnit: (unit: PreservedTimeUnit) => boolean;
/**
 * Builds select options that always include the default d/h/m/s options and, when relevant,
 * appends a non-default unit that can be present in persisted config (`ms`, `micros`, `nanos`)
 * so it can be displayed and preserved.
 */
export declare const getUnitSelectOptions: (baseTimeUnitOptions: ReadonlyArray<{
    value: TimeUnit;
    text: string;
}>, currentUnit: PreservedTimeUnit) => TimeUnitSelectOption[];
