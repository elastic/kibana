import type { Moment } from 'moment';
import type { RecurrenceFrequency, RecurringSchedule } from '../types';
export declare const recurringSummary: ({ startDate, recurringSchedule, presets, showTime, }: {
    startDate?: Moment;
    recurringSchedule?: RecurringSchedule;
    presets: Record<RecurrenceFrequency, Partial<RecurringSchedule>>;
    showTime?: boolean;
}) => string;
export declare const toWeekdayName: (weekday: string) => string;
