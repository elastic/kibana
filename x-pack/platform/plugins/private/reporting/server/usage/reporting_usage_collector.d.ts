import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ReportingCore } from '..';
import type { ReportingUsage } from './types';
export type ReportingUsageType = ReportingUsage & {
    available: boolean;
    enabled: boolean;
};
export declare function registerReportingUsageCollector(reporting: ReportingCore, taskManager: Promise<TaskManagerStartContract>, usageCollection: UsageCollectionSetup): void;
