import type { Logger, CoreSetup } from '@kbn/core/server';
import type { IntervalSchedule, TaskManagerStartContract, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { ActionsConfig } from '../config';
import type { ActionsPluginsStart } from '../plugin';
export declare const CONNECTOR_USAGE_REPORTING_TASK_SCHEDULE: IntervalSchedule;
export declare const CONNECTOR_USAGE_REPORTING_TASK_ID = "connector_usage_reporting";
export declare const CONNECTOR_USAGE_REPORTING_TASK_TYPE = "actions:connector_usage_reporting";
export declare const CONNECTOR_USAGE_REPORTING_TASK_TIMEOUT = 30000;
export declare const CONNECTOR_USAGE_TYPE = "connector_request_body_bytes";
export declare const CONNECTOR_USAGE_REPORTING_SOURCE_ID = "task-connector-usage-report";
export declare const MAX_PUSH_ATTEMPTS = 5;
export declare class ConnectorUsageReportingTask {
    private readonly logger;
    private readonly eventLogIndex;
    private readonly projectId;
    private readonly caCertificate;
    private readonly usageApiUrl;
    private readonly enabled;
    constructor({ logger, eventLogIndex, core, taskManager, projectId, config, }: {
        logger: Logger;
        eventLogIndex: string;
        core: CoreSetup<ActionsPluginsStart>;
        taskManager: TaskManagerSetupContract;
        projectId: string | undefined;
        config: ActionsConfig['usage'];
    });
    start: (taskManager?: TaskManagerStartContract) => Promise<void>;
    private runTask;
    private getTotalUsage;
    private createUsageRecord;
    private pushUsageRecord;
    private getDelayedRetryDate;
}
