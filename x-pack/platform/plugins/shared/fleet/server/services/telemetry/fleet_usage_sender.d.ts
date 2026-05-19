import type { TaskManagerStartContract, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import type { FleetUsage } from '../../collectors/register';
export declare class FleetUsageSender {
    private taskManager?;
    private taskVersion;
    private taskType;
    private wasStarted;
    private interval;
    private timeout;
    constructor(taskManager: TaskManagerSetupContract, core: CoreSetup, fetchUsage: (abortController: AbortController) => Promise<FleetUsage | undefined>);
    private runTask;
    private get taskId();
    start(taskManager: TaskManagerStartContract): Promise<void>;
    /**
     *  took schema from [here](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/fleet/server/collectors/register.ts#L53) and adapted to EBT format
     */
    private registerTelemetryEventType;
}
