import type { Observable } from 'rxjs';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { MonitoredHealth } from '../routes/health';
import type { TaskManagerUsage } from './types';
import type { MonitoredUtilization } from '../routes/background_task_utilization';
export declare function createTaskManagerUsageCollector(usageCollection: UsageCollectionSetup, monitoringStats$: Observable<MonitoredHealth>, monitoredUtilization$: Observable<MonitoredUtilization>, excludeTaskTypes: string[]): import("@kbn/usage-collection-plugin/server").Collector<TaskManagerUsage, {}>;
export declare function registerTaskManagerUsageCollector(usageCollection: UsageCollectionSetup, monitoringStats$: Observable<MonitoredHealth>, monitoredUtilization$: Observable<MonitoredUtilization>, excludeTaskTypes: string[]): void;
