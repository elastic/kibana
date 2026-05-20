import type { z } from '@kbn/zod/v4';
import type { Condition } from './conditions';
import type { StreamlangProcessorDefinition } from './processors';
import type { StreamlangStepWithUIAttributes } from './ui';
/**
 * Stream type for filtering available Streamlang actions and validation rules.
 * - 'wired': Wired streams (excludes manual_ingest_pipeline)
 * - 'classic': Classic streams (all actions available)
 */
export type StreamType = 'wired' | 'classic';
export declare const conditionWithStepsSchema: z.ZodType<ConditionWithSteps>;
export type ConditionWithSteps = Condition & {
    steps: StreamlangStep[];
    else?: StreamlangStep[];
};
/**
 * Nested condition block (recursive)
 */
export interface StreamlangConditionBlock {
    customIdentifier?: string;
    condition: ConditionWithSteps;
}
/**
 * Zod schema for a condition block
 */
export declare const streamlangConditionBlockSchema: z.ZodType<StreamlangConditionBlock>;
export declare const isConditionBlockSchema: (obj: unknown) => obj is StreamlangConditionBlock;
export declare const isConditionBlock: (obj: unknown) => obj is StreamlangConditionBlock;
/**
 * A step can be either a processor or a condition block (optionally recursive)
 */
export type StreamlangStep = StreamlangProcessorDefinition | StreamlangConditionBlock;
export declare const streamlangStepSchema: z.ZodType<StreamlangStep>;
export declare const isActionBlockSchema: (obj: unknown) => obj is StreamlangProcessorDefinition;
export declare const isActionBlock: <TBlock extends StreamlangStep | StreamlangStepWithUIAttributes>(obj?: TBlock) => obj is Extract<TBlock, {
    action: string;
}>;
/**
 * Streamlang DSL Root Type
 */
export interface StreamlangDSL {
    steps: StreamlangStep[];
}
/**
 * Streamlang as stored on stream `ingest.processing`: the DSL plus the server-managed
 * `updated_at` cursor. Use {@link StreamlangDSL} anywhere you need the pipeline document only
 * (YAML, simulation body, DeepStrict validation).
 */
export type StreamlangDSLWithUpdatedAt = StreamlangDSL & {
    updated_at: string;
};
/**
 * Zod schema for the Streamlang DSL root
 */
export declare const streamlangDSLSchema: z.ZodObject<{
    steps: z.ZodArray<z.ZodType<StreamlangStep, unknown, z.core.$ZodTypeInternals<StreamlangStep, unknown>>>;
}, z.core.$strip>;
/**
 * Strict version of streamlangDSLSchema that rejects excess/unknown keys.
 * Pre-constructed for performance as DeepStrict creates proxy wrappers,
 */
export declare const streamlangDSLSchemaStrict: z.ZodPipe<z.ZodUnknown, z.ZodObject<{
    steps: z.ZodArray<z.ZodType<StreamlangStep, unknown, z.core.$ZodTypeInternals<StreamlangStep, unknown>>>;
}, z.core.$strip>>;
export declare const isStreamlangDSLSchema: (obj: unknown) => obj is StreamlangDSL;
