import type { FC } from 'react';
export interface TimeRange {
    start: number;
    end: number;
}
interface Props {
    setTimeRange: (d: TimeRange) => void;
    timeRange: TimeRange;
}
export declare const TimeRangePicker: FC<Props>;
export {};
