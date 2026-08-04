import { Aggregation, Comparator } from './form_types';
export declare const AGGREGATION_OPTIONS: {
    value: Aggregation;
    text: string;
}[];
export declare const COMPARATOR_OPTIONS: {
    value: Comparator;
    text: string;
}[];
export declare const CONDITION_OPERATOR_OPTIONS: {
    id: string;
    label: string;
}[];
export declare const THRESHOLD_STEP_TITLE: string;
export declare const STAT_LABEL_REQUIRED_ERROR: string;
export declare const STAT_FIELD_REQUIRED_ERROR: string;
export declare const EXPRESSION_UNKNOWN_REFERENCE_ERROR: (unknownLabels: string[]) => string;
