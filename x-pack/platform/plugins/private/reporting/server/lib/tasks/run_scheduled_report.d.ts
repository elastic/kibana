import type { KibanaRequest, SavedObject } from '@kbn/core/server';
import type { TaskRunResult } from '@kbn/reporting-common/types';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { ScheduledReportTaskParams, ScheduledReportTaskParamsWithoutSpaceId } from '.';
import type { SavedReport } from '../store';
import type { PrepareJobResults } from './run_report';
import { RunReportTask } from './run_report';
import type { ScheduledReportType } from '../../types';
export declare class RunScheduledReportTask extends RunReportTask<ScheduledReportTaskParams> {
    readonly exportType: "scheduled";
    get TYPE(): string;
    protected prepareJob(taskInstance: ConcreteTaskInstance): Promise<PrepareJobResults>;
    protected getMaxAttempts(): {
        maxTaskAttempts: number;
        maxRetries: number;
    };
    protected notify(report: SavedReport, taskInstance: ConcreteTaskInstance, output: TaskRunResult, byteSize: number, scheduledReport?: SavedObject<ScheduledReportType>, spaceId?: string): Promise<void>;
    getTaskDefinition(): {
        type: string;
        title: string;
        createTaskRunner: import("@kbn/task-manager-plugin/server").TaskRunCreatorFunction;
        timeout: string;
        maxConcurrency: number;
    };
    scheduleTask(request: KibanaRequest, params: ScheduledReportTaskParamsWithoutSpaceId): Promise<ConcreteTaskInstance>;
}
