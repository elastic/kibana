import { ProcessorEvent } from '@kbn/apm-types-shared';
import * as t from 'io-ts';
export declare const processorEventRt: t.UnionC<[t.LiteralC<ProcessorEvent.transaction>, t.LiteralC<ProcessorEvent.error>, t.LiteralC<ProcessorEvent.metric>, t.LiteralC<ProcessorEvent.span>]>;
/**
 * Processor events that are searchable in the UI via the query bar.
 *
 * Some client-side routes will define 1 or more processor events that
 * will be used to fetch the dynamic data view for the query bar.
 */
export type UIProcessorEvent = ProcessorEvent.transaction | ProcessorEvent.error | ProcessorEvent.metric;
