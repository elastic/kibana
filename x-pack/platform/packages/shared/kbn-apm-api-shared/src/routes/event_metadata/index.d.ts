export declare const eventMetadataRouteDefinitions: {
    eventMetadata: {
        endpoint: "GET /internal/apm/event_metadata/{processorEvent}/{id}";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                processorEvent: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.transaction>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.error>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.metric>, import("zod").ZodLiteral<import("@kbn/apm-types-shared").ProcessorEvent.span>]>;
                id: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./event_metadata").EventMetadataResponse>;
};
export type { EventMetadataResponse } from './event_metadata';
