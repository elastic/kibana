import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Plugin } from './plugin';
import type { EsContext } from './es';
import type { EventLogService } from './event_log_service';
import type { IEvent, IEventLogger } from './types';
import type { InternalFields } from './es/cluster_client_adapter';
type SystemLogger = Plugin['systemLogger'];
interface IEventLoggerCtorParams {
    esContext: EsContext;
    eventLogService: EventLogService;
    initialProperties: IEvent;
    systemLogger: SystemLogger;
}
export declare class EventLogger implements IEventLogger {
    private esContext;
    private eventLogService;
    private initialProperties;
    private systemLogger;
    constructor(ctorParams: IEventLoggerCtorParams);
    startTiming(event: IEvent, startTime?: Date): void;
    stopTiming(event: IEvent): void;
    logEvent(eventProperties: IEvent, id?: string): void;
    updateEvents(events: Array<{
        internalFields: InternalFields;
        event: IEvent;
    }>): Promise<BulkResponse>;
}
export declare const EVENT_LOGGED_PREFIX = "event logged: ";
export {};
