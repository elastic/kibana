import type { RRuleParams, RecurringSchedule } from '../types';
export declare const convertToRRule: ({ startDate, timezone, recurringSchedule, includeTime, }: {
    startDate: string;
    timezone: string;
    recurringSchedule?: RecurringSchedule;
    includeTime?: boolean;
}) => RRuleParams;
