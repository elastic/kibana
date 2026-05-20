import type { LogsLocatorParams } from './logs_locator';
export interface NodeLogsParams {
    nodeField: string;
    nodeId: string;
    filter?: string;
}
export declare const getNodeQuery: (params: NodeLogsParams) => LogsLocatorParams["query"];
export interface TraceLogsParams {
    traceId: string;
    filter?: string;
}
export declare const getTraceQuery: (params: TraceLogsParams) => LogsLocatorParams["query"];
export declare function getTimeRange(time: number | undefined): LogsLocatorParams['timeRange'];
export declare const getTimeRangeStartFromTime: (time: number) => string;
export declare const getTimeRangeEndFromTime: (time: number) => string;
