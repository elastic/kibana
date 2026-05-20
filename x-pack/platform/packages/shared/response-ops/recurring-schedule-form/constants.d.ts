import { Frequency } from '@kbn/rrule';
export declare const ISO_WEEKDAYS: readonly [1, 2, 3, 4, 5, 6, 7];
export declare const DEFAULT_FREQUENCY_OPTIONS: ({
    text: string;
    value: Frequency;
} | {
    text: string;
    value: string;
})[];
export declare const DEFAULT_PRESETS: {
    4: {
        interval: number;
    };
    3: {
        interval: number;
    };
    2: {
        interval: number;
    };
    1: {
        interval: number;
    };
    0: {
        interval: number;
    };
};
export declare enum RecurrenceEnd {
    NEVER = "never",
    ON_DATE = "ondate",
    AFTER_X = "afterx"
}
export declare const RECURRENCE_END_NEVER: {
    id: string;
    label: string;
    'data-test-subj': string;
};
export declare const RECURRENCE_END_OPTIONS: {
    id: string;
    label: string;
    'data-test-subj': string;
}[];
export declare const ISO_WEEKDAYS_TO_RRULE: Record<number, string>;
export declare const RRULE_TO_ISO_WEEKDAYS: Record<string, number>;
export declare const WEEKDAY_OPTIONS: {
    id: string;
    label: string;
    'data-test-subj': string;
}[];
export declare const RRULE_WEEKDAYS_TO_ISO_WEEKDAYS: {
    [x: string]: number;
};
export declare const RECURRING_SCHEDULE_FORM_CUSTOM_FREQUENCY: (interval?: number) => {
    text: string;
    value: Frequency;
    'data-test-subj': string;
}[];
