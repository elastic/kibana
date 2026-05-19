import type { Logger } from '@kbn/core/server';
import type { SavedReport } from './store';
export declare const MAX_DELAY_SECONDS = 30;
interface RetryOpts {
    attempt?: number;
    logger: Logger;
    operation: (rep: SavedReport) => Promise<void>;
    report: SavedReport;
    retries: number;
}
export declare const retryOnError: ({ operation, retries, report, logger, attempt, }: RetryOpts) => Promise<void>;
export {};
