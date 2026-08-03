export declare const environmentsRouteDefinitions: {
    environments: {
        endpoint: "GET /internal/apm/environments";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./environments").EnvironmentsResponse>;
};
export type { EnvironmentsResponse } from './environments';
