import type { Logger } from '@kbn/core/server';
interface WrappedLoggerOpts {
    logger: Logger;
    tags: string[];
}
export declare function createWrappedLogger(opts: WrappedLoggerOpts): Logger;
export {};
