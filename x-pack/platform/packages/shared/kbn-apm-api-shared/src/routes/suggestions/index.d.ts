export declare const suggestionsRouteDefinitions: {
    suggestions: {
        endpoint: "GET /internal/apm/suggestions";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                fieldName: import("zod").ZodString;
                fieldValue: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./suggestions").SuggestionsResponse>;
};
export type { SuggestionsResponse } from './suggestions';
