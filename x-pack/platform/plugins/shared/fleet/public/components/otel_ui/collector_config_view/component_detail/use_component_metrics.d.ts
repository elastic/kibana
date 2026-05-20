import type { OTelComponentType } from '../constants';
interface MetricSeries {
    label: string;
    data: Array<{
        x: number;
        y: number;
    }>;
}
export interface MetricGroup {
    id: string;
    series: MetricSeries[];
}
interface UseComponentMetricsResult {
    groups: MetricGroup[];
    isLoading: boolean;
    error?: Error;
}
export declare const useComponentMetrics: ({ componentId, componentType, timeRangeMs, fixedInterval, }: {
    componentId: string;
    componentType: OTelComponentType;
    timeRangeMs: number;
    fixedInterval: string;
}) => UseComponentMetricsResult;
export {};
