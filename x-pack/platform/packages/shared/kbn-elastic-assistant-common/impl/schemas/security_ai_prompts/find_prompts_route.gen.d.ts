import { z } from '@kbn/zod/v4';
export type FindSecurityAIPromptsRequestQuery = z.infer<typeof FindSecurityAIPromptsRequestQuery>;
export declare const FindSecurityAIPromptsRequestQuery: z.ZodObject<{
    connector_id: z.ZodOptional<z.ZodString>;
    prompt_group_id: z.ZodString;
    prompt_ids: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type FindSecurityAIPromptsRequestQueryInput = z.input<typeof FindSecurityAIPromptsRequestQuery>;
export type FindSecurityAIPromptsResponse = z.infer<typeof FindSecurityAIPromptsResponse>;
export declare const FindSecurityAIPromptsResponse: z.ZodObject<{
    prompts: z.ZodArray<z.ZodObject<{
        promptId: z.ZodString;
        prompt: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
