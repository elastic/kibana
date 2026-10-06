import type { Observable } from 'rxjs';
import type { Logger, DocLinksServiceSetup } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';
import type { MonitoredHealth } from '../routes/health';
export declare function resetLastLogLevel(): void;
export declare function setupIntervalLogging(monitoredHealth$: Observable<MonitoredHealth>, logger: Logger, minutes: number): void;
export declare function logHealthMetrics(monitoredHealth: MonitoredHealth, logger: Logger, config: TaskManagerConfig, shouldRunTasks: boolean, docLinks: DocLinksServiceSetup): void;
