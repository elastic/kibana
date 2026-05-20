import type { OpenAPIV3 } from 'openapi-types';
import type { z } from '@kbn/zod/v4';
export declare const pipelineDefinitionSchema: z.ZodObject<{
    steps: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        customIdentifier: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ignore_failure: z.ZodOptional<z.ZodBoolean>;
        where: z.ZodOptional<z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
        action: z.ZodLiteral<"grok">;
        from: z.ZodString;
        patterns: z.ZodArray<z.ZodString>;
        pattern_definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        ignore_missing: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        customIdentifier: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ignore_failure: z.ZodOptional<z.ZodBoolean>;
        where: z.ZodOptional<z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
        action: z.ZodLiteral<"dissect">;
        from: z.ZodString;
        pattern: z.ZodString;
        append_separator: z.ZodOptional<z.ZodString>;
        ignore_missing: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        customIdentifier: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ignore_failure: z.ZodOptional<z.ZodBoolean>;
        where: z.ZodOptional<z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
        action: z.ZodLiteral<"date">;
        from: z.ZodString;
        to: z.ZodOptional<z.ZodString>;
        formats: z.ZodArray<z.ZodString>;
        output_format: z.ZodOptional<z.ZodString>;
        timezone: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        customIdentifier: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ignore_failure: z.ZodOptional<z.ZodBoolean>;
        where: z.ZodOptional<z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
        action: z.ZodLiteral<"remove">;
        from: z.ZodString;
        ignore_missing: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        customIdentifier: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ignore_failure: z.ZodOptional<z.ZodBoolean>;
        where: z.ZodOptional<z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
        action: z.ZodLiteral<"rename">;
        from: z.ZodString;
        to: z.ZodString;
        ignore_missing: z.ZodOptional<z.ZodBoolean>;
        override: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        customIdentifier: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ignore_failure: z.ZodOptional<z.ZodBoolean>;
        where: z.ZodOptional<z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
        action: z.ZodLiteral<"convert">;
        from: z.ZodString;
        to: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<{
            string: "string";
            boolean: "boolean";
            integer: "integer";
            long: "long";
            double: "double";
        }>;
        ignore_missing: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
/**
 * When a system-managed grok/dissect step runs first, the agent only proposes
 * post-parse processors; grok/dissect are excluded to avoid duplicate parsing.
 */
export declare const postParsePipelineDefinitionSchema: z.ZodObject<{
    steps: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        customIdentifier: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ignore_failure: z.ZodOptional<z.ZodBoolean>;
        where: z.ZodOptional<z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
        action: z.ZodLiteral<"date">;
        from: z.ZodString;
        to: z.ZodOptional<z.ZodString>;
        formats: z.ZodArray<z.ZodString>;
        output_format: z.ZodOptional<z.ZodString>;
        timezone: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        customIdentifier: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ignore_failure: z.ZodOptional<z.ZodBoolean>;
        where: z.ZodOptional<z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
        action: z.ZodLiteral<"remove">;
        from: z.ZodString;
        ignore_missing: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        customIdentifier: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ignore_failure: z.ZodOptional<z.ZodBoolean>;
        where: z.ZodOptional<z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
        action: z.ZodLiteral<"rename">;
        from: z.ZodString;
        to: z.ZodString;
        ignore_missing: z.ZodOptional<z.ZodBoolean>;
        override: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        customIdentifier: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ignore_failure: z.ZodOptional<z.ZodBoolean>;
        where: z.ZodOptional<z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>>;
        action: z.ZodLiteral<"convert">;
        from: z.ZodString;
        to: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<{
            string: "string";
            boolean: "boolean";
            integer: "integer";
            long: "long";
            double: "double";
        }>;
        ignore_missing: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
export type PipelineDefinition = z.infer<typeof pipelineDefinitionSchema>;
export type PostParsePipelineDefinition = z.infer<typeof postParsePipelineDefinitionSchema>;
export declare const FULL_PIPELINE_ACTIONS: Set<string>;
export declare const POST_PARSE_PIPELINE_ACTIONS: Set<string>;
/** Zod schema passed to `suggestProcessingPipeline` to constrain tool calls; chosen by the caller. */
export type SuggestPipelineAgentSchema = typeof pipelineDefinitionSchema | typeof postParsePipelineDefinitionSchema;
export declare function getPipelineDefinitionJsonSchema(schema: z.ZodType): OpenAPIV3.SchemaObject;
