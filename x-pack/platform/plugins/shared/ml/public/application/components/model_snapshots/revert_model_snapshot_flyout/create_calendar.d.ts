import type { FC } from 'react';
import type moment from 'moment';
import type { Anomaly } from '../../../jobs/new_job/common/results_loader/results_loader';
import type { LineChartPoint } from '../../../jobs/new_job/common/chart_loader/chart_loader';
export interface CalendarEvent {
    start: moment.Moment | null;
    end: moment.Moment | null;
    description: string;
}
interface Props {
    calendarEvents: CalendarEvent[];
    setCalendarEvents: (calendars: CalendarEvent[]) => void;
    minSelectableTimeStamp: number;
    maxSelectableTimeStamp: number;
    eventRateData: LineChartPoint[];
    anomalies: Anomaly[];
    chartReady: boolean;
}
export declare const CreateCalendar: FC<Props>;
export {};
