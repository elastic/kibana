import type { CoreSetup } from '@kbn/core/public';
import type { z } from '@kbn/zod/v4';
export declare const createRunAgentStepDefinition: (core: CoreSetup) => import("@kbn/workflows-extensions/public").PublicStepDefinition<z.ZodObject<{
    schema: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodLiteral<"object">>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        $ref: z.ZodOptional<z.ZodString> | z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
            [x: string]: string;
        }>, z.ZodString]>>;
        properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown, z.core.$ZodTypeInternals<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
        additionalProperties: z.ZodOptional<z.ZodBoolean>;
        required: z.ZodOptional<z.ZodArray<z.ZodString>>;
        definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown, z.core.$ZodTypeInternals<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
        $defs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown, z.core.$ZodTypeInternals<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
    }, z.core.$strip>>;
    message: z.ZodString;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        origin: z.ZodOptional<z.ZodString>;
        hidden: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    conversation_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    configuration_overrides: z.ZodOptional<z.ZodObject<{
        instructions: z.ZodOptional<z.ZodString>;
        tools: z.ZodOptional<z.ZodArray<z.ZodObject<{
            tool_ids: z.ZodArray<z.ZodString>;
        }, z.core.$strip>>>;
        skill_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
        enable_elastic_capabilities: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    message: z.ZodString;
    structured_output: z.ZodOptional<z.ZodAny>;
    conversation_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodObject<{
        usage: z.ZodObject<{
            connectorId: z.ZodOptional<z.ZodString>;
            inputTokens: z.ZodNumber;
            outputTokens: z.ZodNumber;
            cachedTokens: z.ZodOptional<z.ZodNumber>;
            totalTokens: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    'agent-id': z.ZodOptional<z.ZodString>;
    'connector-id': z.ZodOptional<z.ZodString>;
    'inference-id': z.ZodOptional<z.ZodString>;
    'connector-id-by-feature': z.ZodOptional<z.ZodString>;
    'create-conversation': z.ZodOptional<z.ZodBoolean>;
    'public-conversation': z.ZodOptional<z.ZodBoolean>;
    'plugin-id': z.ZodOptional<z.ZodString>;
    'aggregate-by': z.ZodOptional<z.ZodString>;
    'max-step-size': z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
