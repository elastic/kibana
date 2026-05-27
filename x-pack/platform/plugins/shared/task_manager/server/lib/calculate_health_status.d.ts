import type { Logger } from '@kbn/core/server';
import type { RawMonitoringStats } from '../monitoring';
import { HealthStatus } from '../monitoring';
import type { TaskManagerConfig } from '../config';
export declare function calculateHealthStatus(summarizedStats: RawMonitoringStats, config: TaskManagerConfig, shouldRunTasks: boolean, logger: Logger): {
    status: HealthStatus;
    reason?: string;
};
