import { z } from '@kbn/zod/v4';
import type { SpanLinkDetails } from '@kbn/apm-types';
export interface LinkedChildrenResponse {
    spanLinksDetails: SpanLinkDetails[];
}
export declare const linkedChildrenRoute: {
    endpoint: "GET /internal/apm/traces/{traceId}/span_links/{spanId}/children";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            traceId: z.ZodString;
            spanId: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<LinkedChildrenResponse>;
