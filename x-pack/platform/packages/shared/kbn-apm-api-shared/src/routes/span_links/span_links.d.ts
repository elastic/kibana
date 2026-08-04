import { z } from '@kbn/zod/v4';
import type { SpanLinkDetails } from '@kbn/apm-types';
export interface SpanLinksResponse {
    outgoingSpanLinks: SpanLinkDetails[];
    incomingSpanLinks: SpanLinkDetails[];
}
export declare const spanLinksRoute: {
    endpoint: "GET /internal/apm/traces/{traceId}/span_links/{spanId}";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            traceId: z.ZodString;
            spanId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            processorEvent: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.transaction>, z.ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.error>, z.ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.metric>, z.ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.span>]>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<SpanLinksResponse>;
