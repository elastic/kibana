import type { KibanaRequest } from '@kbn/core/server';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { ReportTaskParams } from '.';
import type { PrepareJobResults } from './run_report';
import { RunReportTask } from './run_report';
export declare class RunSingleReportTask extends RunReportTask<ReportTaskParams> {
    readonly exportType: "single";
    get TYPE(): string;
    private claimJob;
    protected prepareJob(taskInstance: ConcreteTaskInstance): Promise<PrepareJobResults>;
    protected getMaxAttempts(): {
        maxTaskAttempts: number;
        maxRetries: number;
    };
    protected notify(): Promise<void>;
    getTaskDefinition(): {
        type: string;
        title: string;
        createTaskRunner: import("@kbn/task-manager-plugin/server").TaskRunCreatorFunction;
        maxAttempts: number;
        timeout: string;
        maxConcurrency: number;
    };
    scheduleTask(request: KibanaRequest, params: ReportTaskParams, options?: {
        useInternalUser?: boolean;
    }): Promise<ConcreteTaskInstance>;
}
