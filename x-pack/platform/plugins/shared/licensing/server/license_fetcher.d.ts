import type { MaybePromise } from '@kbn/utility-types';
import type { IClusterClient, Logger } from '@kbn/core/server';
import type { LicenseFetcher } from './types';
export declare const getLicenseFetcher: ({ clusterClient, logger, cacheDurationMs, maxRetryDelay, }: {
    clusterClient: MaybePromise<IClusterClient>;
    logger: Logger;
    cacheDurationMs: number;
    maxRetryDelay: number;
}) => LicenseFetcher;
