import type { Logger, CoreSetup } from '@kbn/core/server';
import type { RunContext, TaskManagerSetupContract, TaskManagerStartContract, IntervalSchedule } from '@kbn/task-manager-plugin/server';
export declare const TELEMETRY_TASK_TYPE = "reporting_telemetry";
export declare const TASK_ID = "Reporting-reporting_telemetry";
export declare const SCHEDULE: IntervalSchedule;
export declare function initializeReportingTelemetryTask(logger: Logger, core: CoreSetup, taskManager: TaskManagerSetupContract): void;
export declare function scheduleReportingTelemetry(logger: Logger, taskManager?: TaskManagerStartContract): void;
export declare function telemetryTaskRunner(logger: Logger, core: CoreSetup): ({ taskInstance }: RunContext) => {
    run(): Promise<{
        state: Readonly<{
            error_messages?: any[] | undefined;
        } & {
            runs: number;
            has_errors: boolean;
            number_of_scheduled_reports: number;
            number_of_enabled_scheduled_reports: number;
            number_of_scheduled_reports_by_type: Record<string, number>;
            number_of_enabled_scheduled_reports_by_type: Record<string, number>;
            number_of_scheduled_reports_with_notifications: number;
        }>;
        schedule: IntervalSchedule;
    } | {
        state: Readonly<{
            error_messages?: any[] | undefined;
        } & {
            runs: number;
            has_errors: boolean;
            number_of_scheduled_reports: number;
            number_of_enabled_scheduled_reports: number;
            number_of_scheduled_reports_by_type: Record<string, number>;
            number_of_enabled_scheduled_reports_by_type: Record<string, number>;
            number_of_scheduled_reports_with_notifications: number;
        }>;
        schedule: IntervalSchedule;
    }>;
};
