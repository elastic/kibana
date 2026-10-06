import type { LatestTaskStateSchema } from '../task_state';
export interface TermsBucket {
    key: string;
    doc_count: number;
}
export interface EventLogStatsAggregations {
    by_task_type: {
        buckets: TermsBucket[];
        sum_other_doc_count: number;
    };
    delay_percentiles: {
        values: Record<string, number | null>;
    };
}
export type EventLogStatsResults = Pick<LatestTaskStateSchema, 'total_task_runs_24hr' | 'task_runs_by_type_24hr' | 'task_runs_other_24hr' | 'schedule_delay_ms_24hr'>;
