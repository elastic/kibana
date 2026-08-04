import { z } from '@kbn/zod/v4';
export interface EventMetadataResponse {
    metadata: Partial<Record<string, unknown[]>>;
}
export declare const eventMetadataRoute: {
    endpoint: "GET /internal/apm/event_metadata/{processorEvent}/{id}";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            processorEvent: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.transaction>, z.ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.error>, z.ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.metric>, z.ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.span>]>;
            id: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<EventMetadataResponse>;
