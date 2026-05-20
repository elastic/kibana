import type { Moment } from 'moment';
export declare const getWeekdayInfo: (date: Moment, dayOfWeekFmt?: string) => {
    dayOfWeek: string;
    nthWeekdayOfMonth: number;
    isLastOfMonth: boolean;
};
