import type { IRouter, Logger } from '@kbn/core/server';
import type { IClusterClient } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { MonitoringStats } from '../monitoring';
import type { TaskManagerConfig } from '../config';
import type { BackgroundTaskUtilizationStat, PublicBackgroundTaskUtilizationStat } from '../monitoring/background_task_utilization_statistics';
import type { MonitoredStat } from '../monitoring/monitoring_stats_stream';
export interface MonitoredUtilization {
    process_uuid: string;
    timestamp: string;
    last_update: string;
    stats: MonitoredStat<BackgroundTaskUtilizationStat> | MonitoredStat<PublicBackgroundTaskUtilizationStat> | null;
}
export interface BackgroundTaskUtilRouteParams {
    router: IRouter;
    monitoringStats$: Observable<MonitoringStats>;
    logger: Logger;
    taskManagerId: string;
    config: TaskManagerConfig;
    kibanaVersion: string;
    kibanaIndexName: string;
    getClusterClient: () => Promise<IClusterClient>;
    usageCounter?: UsageCounter;
}
export declare function backgroundTaskUtilizationRoute(params: BackgroundTaskUtilRouteParams): Observable<MonitoredUtilization>;
