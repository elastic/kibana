import { type OperatorFunction } from 'rxjs';
import type { ConvertedEvents } from '../default/convert_graph_events';
import { type InternalEvent } from '../default/events';
type ExternalEvents = Exclude<ConvertedEvents, InternalEvent>;
export declare const evictInternalEvents: () => OperatorFunction<ConvertedEvents, ExternalEvents>;
export {};
