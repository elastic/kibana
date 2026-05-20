import type { estypes } from '@elastic/elasticsearch';
export interface IExecutionLog {
    id: string;
    timestamp: string;
    duration_ms: number;
    status: string;
    message: string;
    version: string;
    schedule_delay_ms: number;
    space_ids: string[];
    connector_name: string;
    connector_id: string;
    timed_out: boolean;
    source: string;
}
export interface IExecutionLogResult {
    total: number;
    data: IExecutionLog[];
}
export interface GetGlobalExecutionLogParams {
    dateStart: string;
    dateEnd?: string;
    filter?: string;
    page: number;
    perPage: number;
    sort: estypes.Sort;
    namespaces?: Array<string | undefined>;
}
export interface GetGlobalExecutionKPIParams {
    dateStart: string;
    dateEnd?: string;
    filter?: string;
    namespaces?: Array<string | undefined>;
}
export declare const EMPTY_EXECUTION_KPI_RESULT: {
    success: number;
    unknown: number;
    failure: number;
    warning: number;
};
export type IExecutionKPIResult = typeof EMPTY_EXECUTION_KPI_RESULT;
export declare const executionLogSortableColumns: readonly ["timestamp", "execution_duration", "schedule_delay"];
export type ExecutionLogSortFields = (typeof executionLogSortableColumns)[number];
