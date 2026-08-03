import type { IEvent } from '@kbn/event-log-plugin/server';
import type { RelatedSavedObjects } from './related_saved_objects';
import type { ActionExecutionSource } from './action_execution_source';
export type Event = Exclude<IEvent, undefined>;
interface CreateActionEventLogRecordParams {
    actionId: string;
    action: string;
    actionExecutionId: string;
    name?: string;
    message?: string;
    namespace?: string;
    timestamp?: string;
    spaceId?: string;
    consumer?: string;
    task?: {
        scheduled?: string;
        scheduleDelay?: number;
    };
    executionId?: string;
    savedObjects: Array<{
        type: string;
        id: string;
        typeId: string;
        relation?: string;
    }>;
    relatedSavedObjects?: RelatedSavedObjects;
    isInMemory?: boolean;
    source?: ActionExecutionSource<unknown>;
    actionTypeId: string;
}
export declare function createActionEventLogRecordObject(params: CreateActionEventLogRecordParams): Event;
export {};
