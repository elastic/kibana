import type { Frequency, WeekdayStr, Options } from '@kbn/rrule';
export type RecurrenceFrequency = Extract<Frequency, Frequency.YEARLY | Frequency.MONTHLY | Frequency.WEEKLY | Frequency.DAILY | Frequency.HOURLY>;
export interface RecurringSchedule {
    frequency: RecurrenceFrequency | 'CUSTOM';
    interval?: number;
    ends: string;
    until?: string;
    count?: number;
    customFrequency?: RecurrenceFrequency;
    byweekday?: Record<string, boolean>;
    bymonth?: string;
    bymonthweekday?: string;
    bymonthday?: number;
    byhour?: number;
    byminute?: number;
}
export type RRuleParams = Partial<RRuleRecord> & Pick<RRuleRecord, 'dtstart' | 'tzid'>;
export type RRuleRecord = Omit<Options, 'dtstart' | 'byweekday' | 'wkst' | 'until'> & {
    dtstart: string;
    byweekday?: Array<WeekdayStr | string | number> | null;
    wkst?: WeekdayStr;
    until?: string;
};
