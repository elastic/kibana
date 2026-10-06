import type { Observable } from 'rxjs';
import type { Logger, CoreStatus, IClusterClient } from '@kbn/core/server';
export interface GetElasticsearchAndSOAvailabilityOpts {
    core$: Observable<CoreStatus>;
    isServerless: boolean;
    logger: Logger;
    getClusterClient: () => Promise<IClusterClient>;
}
export declare function getElasticsearchAndSOAvailability({ core$, isServerless, logger, getClusterClient, }: GetElasticsearchAndSOAvailabilityOpts): Observable<boolean>;
