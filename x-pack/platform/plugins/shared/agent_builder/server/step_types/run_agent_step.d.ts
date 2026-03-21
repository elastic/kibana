import type { ServiceManager } from '../services';
/**
 * Server step definition for the "ai.agent" step.
 * This step executes an agentBuilder agent using the execution service.
 */
export declare const getRunAgentStepDefinition: (serviceManager: ServiceManager) => import("@kbn/workflows-extensions/server").ServerStepDefinition<import("zod/v4/index.cjs").ZodObject<{
    schema: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodType<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown, import("zod/v4/core/schemas.cjs").$ZodTypeInternals<import("@kbn/workflows/spec/schema/common/json_model_shape_schema").JsonSchema, unknown>>>;
    message: import("zod/v4/index.cjs").ZodString;
    attachments: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodArray<import("zod/v4/index.cjs").ZodObject<{
        id: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
        type: import("zod/v4/index.cjs").ZodString;
        data: import("zod/v4/index.cjs").ZodRecord<import("zod/v4/index.cjs").ZodString, import("zod/v4/index.cjs").ZodAny>;
        hidden: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodBoolean>;
    }, import("zod/v4/core/schemas.cjs").$strip>>>;
    conversation_id: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
}, import("zod/v4/core/schemas.cjs").$strip>, import("zod/v4/index.cjs").ZodObject<{
    message: import("zod/v4/index.cjs").ZodString;
    structured_output: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodAny>;
    conversation_id: import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
}, import("zod/v4/core/schemas.cjs").$strip>, import("zod/v4/index.cjs").ZodObject<{
    'agent-id': import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
    'connector-id': import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodString>;
    'create-conversation': import("zod/v4/index.cjs").ZodOptional<import("zod/v4/index.cjs").ZodBoolean>;
}, import("zod/v4/core/schemas.cjs").$strip>>;
