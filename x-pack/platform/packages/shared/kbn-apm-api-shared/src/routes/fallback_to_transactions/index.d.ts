export declare const fallbackToTransactionsRouteDefinitions: {
    fallbackToTransactions: {
        endpoint: "GET /internal/apm/fallback_to_transactions";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodObject<{
                kuery: import("zod").ZodString;
                start: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>>;
                end: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>>;
            }, import("zod/v4/core").$strip>>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./fallback_to_transactions").FallbackToTransactionsResponse>;
};
export type { FallbackToTransactionsResponse } from './fallback_to_transactions';
