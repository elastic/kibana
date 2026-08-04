import { ProcessorEvent } from '@kbn/apm-types-shared';
import { z } from '@kbn/zod/v4';
export declare const processorEventSchema: z.ZodUnion<readonly [z.ZodLiteral<ProcessorEvent.transaction>, z.ZodLiteral<ProcessorEvent.error>, z.ZodLiteral<ProcessorEvent.metric>, z.ZodLiteral<ProcessorEvent.span>]>;
/**
 * Processor events that are searchable in the UI via the query bar.
 *
 * Some client-side routes will define 1 or more processor events that
 * will be used to fetch the dynamic data view for the query bar.
 */
export type UIProcessorEvent = ProcessorEvent.transaction | ProcessorEvent.error | ProcessorEvent.metric;
