import React from 'react';
import { Frequency } from '@kbn/rrule';
import type { RecurringSchedule } from '../types';
export interface RecurringScheduleFieldsProps {
    startDate?: string;
    endDate?: string;
    timezone?: string[];
    hideTimezone?: boolean;
    supportsEndOptions?: boolean;
    allowInfiniteRecurrence?: boolean;
    minFrequency?: Frequency;
    showTimeInSummary?: boolean;
    readOnly?: boolean;
    compressed?: boolean;
    initialRecurringSchedule?: RecurringSchedule;
}
/**
 * Renders form fields for the recurring schedule
 */
export declare const RecurringScheduleFormFields: React.MemoExoticComponent<({ startDate, endDate, timezone, minFrequency, hideTimezone, supportsEndOptions, allowInfiniteRecurrence, showTimeInSummary, readOnly, compressed, initialRecurringSchedule, }: RecurringScheduleFieldsProps) => React.JSX.Element>;
