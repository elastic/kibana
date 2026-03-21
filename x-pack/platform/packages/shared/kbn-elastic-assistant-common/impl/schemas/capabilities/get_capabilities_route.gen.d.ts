import { z } from '@kbn/zod/v4';
export type GetCapabilitiesResponse = z.infer<typeof GetCapabilitiesResponse>;
export declare const GetCapabilitiesResponse: z.ZodObject<{
    assistantModelEvaluation: z.ZodBoolean;
    defendInsightsPolicyResponseFailure: z.ZodBoolean;
}, z.core.$strip>;
