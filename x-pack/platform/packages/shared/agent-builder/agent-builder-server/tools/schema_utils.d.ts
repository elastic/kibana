import type { ZodType } from '@kbn/zod/v4';
interface FieldDescription {
    name: string;
    type: string;
    required: boolean;
    description?: string;
}
/**
 * Extracts a human-readable list of field descriptions from a Zod object schema
 * using the public `z.toJSONSchema()` API.
 *
 * Used to describe connector sub-action parameters to the agent LLM.
 */
export declare function describeZodSchema(schema: ZodType): FieldDescription[];
/**
 * Formats a Zod schema into a multi-line parameter summary string for LLM consumption.
 *
 * Example output:
 *   "- query (string, required): Search query to find messages\n- inChannel (string, optional): Channel name"
 */
export declare function formatSchemaForLlm(schema: ZodType): string;
export {};
