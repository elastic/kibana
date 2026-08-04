import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';
/**
 * Step type ID for the rerank workflow step
 */
export declare const RerankStepTypeId = "search.rerank";
/**
 * Default values for rerank step parameters
 */
export declare const RERANK_DEFAULT_RANK_WINDOW_SIZE = 100;
export declare const RERANK_DEFAULT_MAX_INPUT_FIELD_LENGTH = 1000;
export declare const RERANK_DEFAULT_MAX_INPUT_TOTAL_LENGTH = 2000;
/**
 * Input schema for the rerank step
 */
declare const RerankInputSchema: z.ZodObject<{
    rerank_text: z.ZodString;
    data: z.ZodArray<z.ZodAny>;
    fields: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodString>>>;
    rank_window_size: z.ZodDefault<z.ZodNumber>;
    max_input_field_length: z.ZodDefault<z.ZodNumber>;
    max_input_total_length: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Config schema for the rerank step
 * Defines step-level configuration that controls execution behavior
 */
declare const RerankConfigSchema: z.ZodObject<{
    inference_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const RerankOutputSchema: z.ZodArray<z.ZodAny>;
export type RerankInput = z.infer<typeof RerankInputSchema>;
export type RerankConfig = z.infer<typeof RerankConfigSchema>;
export type RerankOutput = z.infer<typeof RerankOutputSchema>;
/**
 * Common step definition for rerank step
 * Shared between server and public implementations
 */
export declare const rerankStepCommonDefinition: CommonStepDefinition<typeof RerankInputSchema, typeof RerankOutputSchema, typeof RerankConfigSchema>;
export {};
