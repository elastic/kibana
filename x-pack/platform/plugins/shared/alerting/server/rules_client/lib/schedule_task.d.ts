import type { RulesClientContext } from '../types';
import type { ScheduleTaskOptions } from '../types';
export declare function scheduleTask(context: RulesClientContext, opts: ScheduleTaskOptions): Promise<import("../../../../task_manager/server").ConcreteTaskInstance | {
    id: string;
    taskType: string;
    schedule: import("@kbn/alerting-types").IntervalSchedule;
    params: {
        alertId: string;
        spaceId: string;
        consumer: string;
    };
    state: {
        previousStartedAt: null;
        alertTypeState: {};
        alertInstances: {};
    };
    scope: string[];
    enabled: boolean;
}>;
