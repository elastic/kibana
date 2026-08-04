import { TIME_UNITS } from './constants';
export declare const getTimeUnitOptions: (unitSize: string) => {
    text: string;
    value: TIME_UNITS;
}[];
export declare const getTimeUnitLabels: (timeUnit?: TIME_UNITS, timeValue?: string) => string;
