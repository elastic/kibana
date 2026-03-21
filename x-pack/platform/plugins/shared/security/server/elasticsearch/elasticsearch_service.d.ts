import type { Observable } from 'rxjs';
import type { Logger, StatusServiceSetup } from '@kbn/core/server';
import type { SecurityLicense } from '../../common';
export interface ElasticsearchServiceSetupParams {
    readonly status: StatusServiceSetup;
    readonly license: SecurityLicense;
}
export interface ElasticsearchServiceStart {
    readonly watchOnlineStatus$: () => Observable<OnlineStatusRetryScheduler>;
}
export interface OnlineStatusRetryScheduler {
    scheduleRetry: () => void;
}
/**
 * Service responsible for interactions with the Elasticsearch.
 */
export declare class ElasticsearchService {
    #private;
    constructor(logger: Logger);
    setup({ status, license }: ElasticsearchServiceSetupParams): void;
    start(): ElasticsearchServiceStart;
}
