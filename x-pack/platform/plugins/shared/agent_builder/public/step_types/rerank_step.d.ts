import type { CoreSetup } from '@kbn/core/public';
export declare const createRerankStepDefinition: (core: CoreSetup) => import("@kbn/workflows-extensions/public").PublicStepDefinition<import("zod").ZodObject<{
    rerank_text: import("zod").ZodString;
    data: import("zod").ZodArray<import("zod").ZodAny>;
    fields: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodArray<import("zod").ZodString>>>;
    rank_window_size: import("zod").ZodDefault<import("zod").ZodNumber>;
    max_input_field_length: import("zod").ZodDefault<import("zod").ZodNumber>;
    max_input_total_length: import("zod").ZodDefault<import("zod").ZodNumber>;
}, import("zod/v4/core").$strip>, import("zod").ZodArray<import("zod").ZodAny>, import("zod").ZodObject<{
    inference_id: import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod/v4/core").$strip>>;
