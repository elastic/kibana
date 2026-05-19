import { z } from '@kbn/zod/v4';
export type DeanonymizeWithReplacementsRequestBody = z.infer<typeof DeanonymizeWithReplacementsRequestBody>;
export declare const DeanonymizeWithReplacementsRequestBody: z.ZodObject<{
    text: z.ZodString;
    replacementsId: z.ZodString;
}, z.core.$strip>;
export type DeanonymizeWithReplacementsRequestBodyInput = z.input<typeof DeanonymizeWithReplacementsRequestBody>;
export type DeanonymizeWithReplacementsResponse = z.infer<typeof DeanonymizeWithReplacementsResponse>;
export declare const DeanonymizeWithReplacementsResponse: z.ZodObject<{
    text: z.ZodString;
}, z.core.$strip>;
export type GetAnonymizationReplacementsRequestParams = z.infer<typeof GetAnonymizationReplacementsRequestParams>;
export declare const GetAnonymizationReplacementsRequestParams: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export type GetAnonymizationReplacementsRequestParamsInput = z.input<typeof GetAnonymizationReplacementsRequestParams>;
export type GetAnonymizationReplacementsResponse = z.infer<typeof GetAnonymizationReplacementsResponse>;
export declare const GetAnonymizationReplacementsResponse: z.ZodObject<{
    id: z.ZodString;
    namespace: z.ZodString;
    replacements: z.ZodArray<z.ZodObject<{
        anonymized: z.ZodString;
        original: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
