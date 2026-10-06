import type { TypeOf } from '@kbn/config-schema';
export declare const stateSchemaByVersion: {
    1: {
        up: (state: Record<string, unknown>) => {
            has_errors: {};
            error_messages: {} | undefined;
            runs: {};
            total_task_runs_24hr: {} | undefined;
            task_runs_by_type_24hr: {} | undefined;
            task_runs_other_24hr: {} | undefined;
            schedule_delay_ms_24hr: {} | undefined;
        };
        schema: import("@kbn/config-schema").ObjectType<{
            has_errors: import("@kbn/config-schema").Type<boolean>;
            error_messages: import("@kbn/config-schema").Type<string[] | undefined>;
            runs: import("@kbn/config-schema").Type<number>;
            total_task_runs_24hr: import("@kbn/config-schema").Type<number | undefined>;
            task_runs_by_type_24hr: import("@kbn/config-schema").Type<Readonly<{} & {
                name: string;
                value: number;
            }>[] | undefined>;
            task_runs_other_24hr: import("@kbn/config-schema").Type<number | undefined>;
            schedule_delay_ms_24hr: import("@kbn/config-schema").Type<Readonly<{} & {
                p50: number | null;
                p75: number | null;
                p95: number | null;
                p99: number | null;
            }> | undefined>;
        }>;
    };
};
declare const latestTaskStateSchema: import("@kbn/config-schema").ObjectType<{
    has_errors: import("@kbn/config-schema").Type<boolean>;
    error_messages: import("@kbn/config-schema").Type<string[] | undefined>;
    runs: import("@kbn/config-schema").Type<number>;
    total_task_runs_24hr: import("@kbn/config-schema").Type<number | undefined>;
    task_runs_by_type_24hr: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        value: number;
    }>[] | undefined>;
    task_runs_other_24hr: import("@kbn/config-schema").Type<number | undefined>;
    schedule_delay_ms_24hr: import("@kbn/config-schema").Type<Readonly<{} & {
        p50: number | null;
        p75: number | null;
        p95: number | null;
        p99: number | null;
    }> | undefined>;
}>;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;
export declare const emptyState: LatestTaskStateSchema;
export {};
