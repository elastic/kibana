import { z } from '@kbn/zod/v4';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { BaseFeature } from '../../feature';
export declare const tokenCountSchema: z.ZodObject<{
    prompt: z.ZodNumber;
    completion: z.ZodNumber;
    thinking: z.ZodOptional<z.ZodNumber>;
    total: z.ZodNumber;
    cached: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const iterationResultSchema: z.ZodObject<{
    runId: z.ZodString;
    iteration: z.ZodNumber;
    durationMs: z.ZodNumber;
    state: z.ZodEnum<{
        success: "success";
        failure: "failure";
    }>;
    tokensUsed: z.ZodObject<{
        prompt: z.ZodNumber;
        completion: z.ZodNumber;
        thinking: z.ZodOptional<z.ZodNumber>;
        total: z.ZodNumber;
        cached: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    newFeatures: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
    }, z.core.$strip>>;
    updatedFeatures: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type IterationResult = z.infer<typeof iterationResultSchema>;
export interface IdentifyFeaturesResult {
    features: BaseFeature[];
    durationMs: number;
    iterations?: IterationResult[];
    totalTokensUsed?: ChatCompletionTokenCount;
}
