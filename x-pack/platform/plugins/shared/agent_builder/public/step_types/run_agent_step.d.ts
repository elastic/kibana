export declare const runAgentStepDefinition: import("@kbn/workflows-extensions/public").PublicStepDefinition<import("zod").ZodObject<{
    schema: import("zod").ZodOptional<import("zod").ZodObject<{
        type: import("zod").ZodOptional<import("zod").ZodLiteral<"object">>;
        title: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        $ref: import("zod").ZodOptional<import("zod").ZodString>;
        properties: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodType<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
        additionalProperties: import("zod").ZodOptional<import("zod").ZodBoolean>;
        required: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        definitions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodType<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
        $defs: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodType<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown, import("zod/v4/core").$ZodTypeInternals<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>>;
    }, import("zod/v4/core").$strip>>;
    message: import("zod").ZodString;
    attachments: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
        id: import("zod").ZodOptional<import("zod").ZodString>;
        type: import("zod").ZodString;
        data: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
        origin: import("zod").ZodOptional<import("zod").ZodString>;
        hidden: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>>>;
    conversation_id: import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    message: import("zod").ZodString;
    structured_output: import("zod").ZodOptional<import("zod").ZodAny>;
    conversation_id: import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod/v4/core").$strip>, import("zod").ZodObject<{
    'agent-id': import("zod").ZodOptional<import("zod").ZodString>;
    'connector-id': import("zod").ZodOptional<import("zod").ZodString>;
    'inference-id': import("zod").ZodOptional<import("zod").ZodString>;
    'create-conversation': import("zod").ZodOptional<import("zod").ZodBoolean>;
}, import("zod/v4/core").$strip>>;
