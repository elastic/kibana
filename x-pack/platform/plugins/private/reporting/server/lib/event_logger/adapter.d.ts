import type { Logger, LogMeta } from '@kbn/core/server';
import type { IReportingEventLogger } from './logger';
/** @internal */
export declare class EcsLogAdapter implements IReportingEventLogger {
    private properties;
    start?: Date;
    end?: Date;
    private logger;
    /**
     * This class provides a logging system to Reporting code, using a shape similar to the EventLog service.
     * The logging action causes ECS data with Reporting metrics sent to DEBUG logs.
     *
     * @param {Logger} logger - Reporting's wrapper of the core logger
     * @param {Partial<LogMeta>} properties - initial ECS data with template for Reporting metrics
     */
    constructor(logger: Logger, properties: Partial<LogMeta>);
    logEvent(message: string, properties: LogMeta): void;
    startTiming(): void;
    stopTiming(): void;
}
