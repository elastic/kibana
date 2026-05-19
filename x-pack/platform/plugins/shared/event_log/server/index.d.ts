import type { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import type { IEventLogConfig } from './types';
export { millisToNanos, nanosToMillis } from '../common';
export type { IEventLogService, IEventLogger, IEventLogClientService, IEvent, IValidatedEvent, IEventLogClient, QueryEventsBySavedObjectResult, AggregateEventsBySavedObjectResult, InternalFields, IValidatedEventInternalDocInfo, } from './types';
export { SAVED_OBJECT_REL_PRIMARY } from './types';
export { createReadySignal } from './lib/ready_signal';
export declare const config: PluginConfigDescriptor<IEventLogConfig>;
export declare const plugin: (context: PluginInitializerContext) => Promise<import("./plugin").Plugin>;
