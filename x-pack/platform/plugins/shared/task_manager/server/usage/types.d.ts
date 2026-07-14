export interface TaskManagerUsage {
    task_type_exclusion: string[];
    failed_tasks: number;
    recurring_tasks: {
        actual_service_time: number;
        adjusted_service_time: number;
    };
    adhoc_tasks: {
        actual_service_time: number;
        adjusted_service_time: number;
    };
    capacity: number;
}
