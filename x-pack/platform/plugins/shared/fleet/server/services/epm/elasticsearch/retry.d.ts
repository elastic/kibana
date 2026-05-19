import type { Logger } from '@kbn/logging';
/**
 * Retries any transient network or configuration issues encountered from Elasticsearch with an exponential backoff.
 * Should only be used to wrap operations that are idempotent and can be safely executed more than once.
 */
export declare const retryTransientEsErrors: <T>(esCall: () => Promise<T>, { logger, attempt, additionalResponseStatuses, }?: {
    logger?: Logger;
    attempt?: number;
    additionalResponseStatuses?: number[];
}) => Promise<T>;
