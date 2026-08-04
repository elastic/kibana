import { z } from '@kbn/zod/v4';
export interface SuggestionsResponse {
    terms: string[];
}
export declare const suggestionsRoute: {
    endpoint: "GET /internal/apm/suggestions";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            fieldName: z.ZodString;
            fieldValue: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            serviceName: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<SuggestionsResponse>;
