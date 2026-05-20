import type { Moment } from 'moment';
export declare const getPresets: (startDate: Moment) => {
    4: {
        interval: number;
    };
    3: {
        interval: number;
    };
    2: {
        interval: number;
        byweekday: Record<string, boolean>;
    };
    1: {
        interval: number;
        bymonth: string;
    };
    0: {
        interval: number;
    };
};
