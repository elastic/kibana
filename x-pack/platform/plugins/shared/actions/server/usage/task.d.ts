import type { Logger, CoreSetup } from '@kbn/core/server';
import type { RunContext, TaskManagerSetupContract, TaskManagerStartContract, IntervalSchedule } from '@kbn/task-manager-plugin/server';
import type { InMemoryConnector } from '../types';
export declare const TELEMETRY_TASK_TYPE = "actions_telemetry";
export declare const TASK_ID = "Actions-actions_telemetry";
export declare const SCHEDULE: IntervalSchedule;
export declare function initializeActionsTelemetry(logger: Logger, taskManager: TaskManagerSetupContract, core: CoreSetup, getInMemoryConnectors: () => InMemoryConnector[], eventLogIndex: string): void;
export declare function scheduleActionsTelemetry(logger: Logger, taskManager: TaskManagerStartContract): void;
export declare function telemetryTaskRunner(logger: Logger, core: CoreSetup, getInMemoryConnectors: () => InMemoryConnector[], eventLogIndex: string): ({ taskInstance }: RunContext) => {
    run(): Promise<{
        state: Readonly<{
            error_messages?: string[] | Record<string, any> | undefined;
        } & {
            runs: number;
            count_by_type: Record<string, number>;
            has_errors: boolean;
            count_total: number;
            count_gen_ai_provider_types: Record<string, number>;
            count_active_total: number;
            count_active_alert_history_connectors: number;
            count_active_by_type: Record<string, number>;
            count_active_email_connectors_by_service_type: Record<string, number>;
            count_actions_namespaces: number;
            count_actions_executions_per_day: number;
            count_actions_executions_by_type_per_day: Record<string, number>;
            count_actions_executions_failed_per_day: number;
            count_actions_executions_failed_by_type_per_day: Record<string, number>;
            count_connector_types_by_action_run_outcome_per_day: Record<string, Record<string, number>>;
            avg_execution_time_per_day: number;
            avg_execution_time_by_type_per_day: Record<string, number>;
        }>;
        schedule: IntervalSchedule;
    }>;
};
