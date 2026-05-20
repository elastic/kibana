import React from 'react';
import type { Frequency } from '@kbn/rrule';
export interface CustomRecurringScheduleProps {
    startDate?: string;
    readOnly?: boolean;
    compressed?: boolean;
    minFrequency?: Frequency;
}
export declare const CustomRecurringSchedule: React.MemoExoticComponent<({ startDate, readOnly, compressed, minFrequency, }: CustomRecurringScheduleProps) => React.JSX.Element>;
