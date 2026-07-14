import type { IRouter, Logger } from '@kbn/core/server';
import type { Observable, Subject } from 'rxjs';
import type { Metrics } from '../metrics';
export interface NodeMetrics {
    process_uuid: string;
    timestamp: string;
    last_update: string;
    metrics: Metrics['metrics'] | null;
}
export interface MetricsRouteParams {
    router: IRouter;
    logger: Logger;
    metrics$: Observable<Metrics>;
    resetMetrics$: Subject<boolean>;
    taskManagerId: string;
}
export declare function metricsRoute(params: MetricsRouteParams): void;
