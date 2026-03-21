import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
/**
 * Step type ID for the agentBuilder run agent step.
 */
export declare const RunAgentStepTypeId = "ai.agent";
/**
 * Input schema for the run agent step.
 */
export declare const InputSchema: z.ZodObject<{
    schema: z.ZodOptional<z.ZodType<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown, z.core.$ZodTypeInternals<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>;
    message: z.ZodString;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodAny>;
        hidden: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    conversation_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Output schema for the run agent step.
 */
export declare const OutputSchema: z.ZodObject<{
    message: z.ZodString;
    structured_output: z.ZodOptional<z.ZodAny>;
    conversation_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Config schema for the run agent step.
 */
export declare const ConfigSchema: z.ZodObject<{
    'agent-id': z.ZodOptional<z.ZodString>;
    'connector-id': z.ZodOptional<z.ZodString>;
    'create-conversation': z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type RunAgentStepInputSchema = typeof InputSchema;
export type RunAgentStepOutputSchema = typeof OutputSchema;
export type RunAgentStepConfigSchema = typeof ConfigSchema;
/**
 * Common step definition for RunAgent step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export declare const runAgentStepCommonDefinition: CommonStepDefinition<RunAgentStepInputSchema, RunAgentStepOutputSchema, RunAgentStepConfigSchema>;
