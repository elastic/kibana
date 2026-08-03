export declare const spanLinksRouteDefinitions: {
    linkedParents: {
        endpoint: "GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                traceId: import("zod").ZodString;
                spanId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                processorEvent: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.transaction>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.error>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.metric>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.span>]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./linked_parents").LinkedParentsResponse>;
    linkedChildren: {
        endpoint: "GET /internal/apm/traces/{traceId}/span_links/{spanId}/children";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                traceId: import("zod").ZodString;
                spanId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./linked_children").LinkedChildrenResponse>;
    spanLinks: {
        endpoint: "GET /internal/apm/traces/{traceId}/span_links/{spanId}";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                traceId: import("zod").ZodString;
                spanId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                processorEvent: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.transaction>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.error>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.metric>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.span>]>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./span_links").SpanLinksResponse>;
};
export type { LinkedParentsResponse } from './linked_parents';
export type { LinkedChildrenResponse } from './linked_children';
export type { SpanLinksResponse } from './span_links';
